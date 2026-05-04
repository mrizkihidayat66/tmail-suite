/** @type {import('next').NextConfig} */
const config = {
  output: "standalone",
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["bcryptjs"],
  },
};

export default config;
