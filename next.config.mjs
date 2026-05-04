/** @type {import('next').NextConfig} */
const config = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["bcryptjs"],
  },
};

export default config;
