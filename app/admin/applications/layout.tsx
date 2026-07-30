import TrackingCodeConsole from "@/components/admin/TrackingCodeConsole";

export default function ApplicationsLayout({children}:{children:React.ReactNode}){
  return <><TrackingCodeConsole kind="applications"/>{children}</>;
}
