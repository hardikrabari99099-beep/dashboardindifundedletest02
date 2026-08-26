// Utility to load Razorpay Standard Checkout SDK and open a UPI-first modal.
// On mobile, this triggers the native UPI intent chooser (GPay / PhonePe /
// Paytm / BHIM etc.). On desktop, Razorpay's modal shows UPI ID / QR options.

let rzpLoading = null;

export function loadRazorpay() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.Razorpay) return Promise.resolve();
  if (rzpLoading) return rzpLoading;
  rzpLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.body.appendChild(s);
  });
  return rzpLoading;
}

/**
 * Open Razorpay Standard Checkout in UPI-first mode.
 * @param {object} co   – checkout order returned by backend
 *   {razorpay_order_id, key_id, amount_paise, customer:{name,email,phone}, description}
 * @param {Function} onSuccess – called with (payment) after signature verified server-side
 * @param {Function} onDismiss – called if user closes the modal without paying
 */
export async function openUpiCheckout(co, onSuccess, onDismiss) {
  await loadRazorpay();
  const options = {
    key: co.key_id,
    order_id: co.razorpay_order_id,
    amount: co.amount_paise,
    currency: "INR",
    name: "IndiFunded",
    description: co.description || "IndiFunded",
    prefill: {
      name: co.customer?.name || "",
      email: co.customer?.email || "",
      contact: co.customer?.phone || "",
    },
    // UPI-first — Razorpay auto-detects Android UPI apps & shows intent chooser
    method: { upi: true, card: false, netbanking: false, wallet: false, emi: false, paylater: false },
    theme: { color: "#1a7a4a" },
    modal: {
      escape: true,
      ondismiss: () => { if (onDismiss) onDismiss(); },
    },
    handler: async (resp) => {
      if (onSuccess) onSuccess(resp);
    },
  };
  const rzp = new window.Razorpay(options);
  rzp.on("payment.failed", (resp) => {
    console.error("Razorpay payment failed", resp?.error);
  });
  rzp.open();
}
