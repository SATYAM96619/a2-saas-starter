export const metadata = {
  title: "A2 SaaS Starter",
  description: "Multi-tenant SaaS starter scaffold",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
