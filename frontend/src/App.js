import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Challenges from "./pages/Challenges";
import { About, Rules, FAQ, Blog, BlogDetail, Contact, Payouts } from "./pages/SimplePages";
import Tools from "./pages/Tools";
import Leaderboard from "./pages/Leaderboard";
import Referral from "./pages/Referral";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import Login from "./pages/Login";
import PayoutRequest from "./pages/PayoutRequest";
import TraderLeague from "./pages/TraderLeague";
import UserDashboardLayout from "./pages/app/UserDashboardLayout";
import UserDashboard from "./pages/app/UserDashboard";
import UserAccounts from "./pages/app/UserAccounts";
import UserPayouts from "./pages/app/UserPayouts";
import UserCertificates from "./pages/app/UserCertificates";
import UserSettings from "./pages/app/UserSettings";
import AdminLayout from "./pages/admin/AdminLayout";
import { AdminDashboard, AdminPlans, AdminBlogs, AdminLeads, AdminOrders, AdminCertificates, AdminPayoutRequests, AdminCoupons, AdminLeaderboard, AdminReferrals, AdminLeague, AdminUsers } from "./pages/admin/AdminPages";
import AdminSettings from "./pages/admin/AdminSettings";
import { AuthProvider } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";

function App() {
  return (
    <SettingsProvider>
    <AuthProvider>
      <BrowserRouter>
        <Toaster richColors theme="dark" position="top-right"/>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home/>}/>
            <Route path="/about" element={<About/>}/>
            <Route path="/challenges" element={<Challenges/>}/>
            <Route path="/rules" element={<Rules/>}/>
            <Route path="/faq" element={<FAQ/>}/>
            <Route path="/tools" element={<Tools/>}/>
            <Route path="/leaderboard" element={<Leaderboard/>}/>
            <Route path="/refer" element={<Referral/>}/>
            <Route path="/blog" element={<Blog/>}/>
            <Route path="/blog/:slug" element={<BlogDetail/>}/>
            <Route path="/contact" element={<Contact/>}/>
            <Route path="/checkout/success" element={<CheckoutSuccess/>}/>
            <Route path="/payout-request" element={<PayoutRequest/>}/>
            <Route path="/payouts" element={<Payouts/>}/>
            <Route path="/league" element={<TraderLeague/>}/>
            <Route path="/login" element={<Login/>}/>
          </Route>
          <Route path="/app" element={<UserDashboardLayout/>}>
            <Route index element={<UserDashboard/>}/>
            <Route path="accounts" element={<UserAccounts/>}/>
            <Route path="payouts" element={<UserPayouts/>}/>
            <Route path="certificates" element={<UserCertificates/>}/>
            <Route path="settings" element={<UserSettings/>}/>
          </Route>
          <Route path="/admin" element={<AdminLayout/>}>
            <Route index element={<AdminDashboard/>}/>
            <Route path="settings" element={<AdminSettings/>}/>
            <Route path="plans" element={<AdminPlans/>}/>
            <Route path="blogs" element={<AdminBlogs/>}/>
            <Route path="certificates" element={<AdminCertificates/>}/>
            <Route path="leaderboard" element={<AdminLeaderboard/>}/>
            <Route path="coupons" element={<AdminCoupons/>}/>
            <Route path="referrals" element={<AdminReferrals/>}/>
            <Route path="payouts" element={<AdminPayoutRequests/>}/>
            <Route path="leads" element={<AdminLeads/>}/>
            <Route path="orders" element={<AdminOrders/>}/>
            <Route path="league" element={<AdminLeague/>}/>
            <Route path="users" element={<AdminUsers/>}/>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
