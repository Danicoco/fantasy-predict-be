const { createCipheriv, createDecipheriv } =require("crypto");

const { ENCRYPTIONIV, ENCRYPTIONKEY } = process.env

exports.decrytData = (message) => {
  const decipher = createDecipheriv(
    "aes-128-cbc",
    Buffer.from(String(ENCRYPTIONKEY)).subarray(0, 16),
    Buffer.from(ENCRYPTIONIV, "hex")
  );
  let decryptedMessage = decipher.update(Buffer.from(message, "hex"));
 
  decryptedMessage = Buffer.concat([decryptedMessage, decipher.final()]);
  return decryptedMessage.toString();
};

exports.encryptData = (message) => {
  let result;
  try {
    const cipher = createCipheriv(
      "aes-128-cbc",
      Buffer.from(String(ENCRYPTIONKEY)).subarray(0, 16),
      Buffer.from(ENCRYPTIONIV, "hex")
    );
    let encryptedMessage = cipher.update(message);
    encryptedMessage = Buffer.concat([encryptedMessage, cipher.final()]);
    result = encryptedMessage.toString("hex");
  } catch (error) {
    console.log(error)
    result = "";
  }
  return result;
};
