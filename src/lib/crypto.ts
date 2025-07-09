import crypto from "crypto";

const algorithm = "aes-256-gcm";
const key = Buffer.from(process.env.ENCRYPTION_KEY || "", "hex");

if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
}

export function encrypt(text: string): { ciphertext: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(12); // GCM recommended IV size
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
        ciphertext: encrypted.toString("base64"),
        iv: iv.toString("base64"),
        tag: tag.toString("base64"),
    };
}

export function decrypt({
    ciphertext,
    iv,
    tag,
}: {
    ciphertext: string;
    iv: string;
    tag: string;
}): string {
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ciphertext, "base64")),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
}

export function hmacEmail(email: string): string {
    const hmac = crypto.createHmac("sha256", process.env.HMAC_SECRET || "");
    hmac.update(email.trim().toLowerCase()); // consistent normalization
    return hmac.digest("hex");
}
