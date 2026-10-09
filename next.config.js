/** @type {import('next').NextConfig} */

const nextConfig = {
    async redirects() {
        return [{ source: "/home-2", destination: "/", permanent: true }];
    },
};

module.exports = nextConfig;
