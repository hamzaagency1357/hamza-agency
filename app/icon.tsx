import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";
const logoUrl = "https://hamza-agency.vercel.app/Logo%20hamza%20agency.jpg";
export default function Icon(){return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#070009",padding:"56px"}}><div style={{width:"400px",height:"400px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"96px",overflow:"hidden",background:"#0b0411",border:"8px solid rgba(212,175,55,.58)"}}><img src={logoUrl} alt="HAMZA AGENCY" style={{width:"100%",height:"100%",objectFit:"contain"}}/></div></div>,size)}
