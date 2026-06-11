import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Hamza Agency",
  description: "Privacy policy for Hamza Agency website, applications, digital service requests, and official contact channels.",
  alternates: { canonical: "https://hamza-agency.com/privacy-policy" },
};

export default function PrivacyPolicyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
