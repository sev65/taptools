import { createHash, randomInt } from "node:crypto";

// Short card codes: no 0/O/1/I/L so they can be read aloud or typed from a sticker.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export function newCardCode(length = 7) {
  let s = "";
  for (let i = 0; i < length; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

const BOT_UA =
  /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|skype|curl|wget|python|go-http|headless|lighthouse|pingdom|uptime/i;

export function classify(userAgent: string) {
  const ua = userAgent || "";
  const isBot = ua === "" || BOT_UA.test(ua);
  const device = /iphone|ipad|ipod/i.test(ua) ? "iphone" : /android/i.test(ua) ? "android" : "other";
  return { isBot, device };
}

export function visitorHash(ip: string, userAgent: string) {
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${ip}|${userAgent}|${day}|${process.env.SESSION_SECRET ?? ""}`)
    .digest("hex")
    .slice(0, 24);
}

// A phone can fire the same NFC tag twice in a second or two. Taps from the same
// visitor on the same card inside this window count once.
export const DOUBLE_TAP_WINDOW_SECONDS = 20;
