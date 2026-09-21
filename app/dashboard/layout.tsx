
// import { UserProvider } from "@/context/UserContext";
// import { CompanyProvider } from "@/context/CompanyContext";
// import { PermissionProvider } from "@/context/PermissionContext";
// import { FinancialYearProvider } from "@/context/FinancialYearContext";
// import DashboardLayout from "@/components/dashboard/DashboardLayout";

// export default function DashboardRootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <UserProvider>
//       <CompanyProvider>
//         <PermissionProvider>
//           <FinancialYearProvider>
//             <DashboardLayout>{children}</DashboardLayout>
//           </FinancialYearProvider>
//         </PermissionProvider>
//       </CompanyProvider>
//     </UserProvider>
//   );
// }

import { UserProvider } from "@/context/UserContext";
import { CompanyProvider } from "@/context/CompanyContext";
import { PermissionProvider } from "@/context/PermissionContext";
import { FinancialYearProvider } from "@/context/FinancialYearContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardHydrationGate from "@/components/DashboardHydrationGate";

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardHydrationGate>
      <UserProvider><CompanyProvider><PermissionProvider><FinancialYearProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </FinancialYearProvider></PermissionProvider></CompanyProvider></UserProvider>
    </DashboardHydrationGate>
  );
}
