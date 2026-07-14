import type { NextConfig } from "next";
const isDevelopment=process.env.NODE_ENV!=="production";
const securityHeaders=[
  {key:"X-Content-Type-Options",value:"nosniff"},{key:"X-Frame-Options",value:"DENY"},{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
  {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"},{key:"Content-Security-Policy",value:`default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'${isDevelopment?" 'unsafe-eval'":""}; connect-src 'self' https:${isDevelopment?" ws:":""}; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`},
];
const nextConfig:NextConfig={output:"standalone",outputFileTracingIncludes:{"/*":["./knowledge/**/*"]},reactStrictMode:true,allowedDevOrigins:["192.168.176.216"],async headers(){return [{source:"/(.*)",headers:securityHeaders}]}};
export default nextConfig;
