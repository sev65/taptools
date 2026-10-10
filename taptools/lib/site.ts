// The public domain cards point at. Set PUBLIC_URL once the domain is bought.
// Changing this later only changes what's shown here; cards already programmed
// keep pointing at whatever URL was written to them, so pick the domain first.
export const siteUrl = () => (process.env.PUBLIC_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const cardUrl = (code: string) => `${siteUrl()}/c/${code}`;
