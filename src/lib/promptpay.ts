// สร้าง payload PromptPay ตามมาตรฐาน EMVCo (Thai QR Payment)
// รองรับเบอร์มือถือ (10 หลัก) และเลขบัตรประชาชน/เลขผู้เสียภาษี (13 หลัก)

const tlv = (id: string, value: string) => id + value.length.toString().padStart(2, "0") + value;

function crc16(data: string) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function promptPayPayload(id: string, amount?: number) {
  const digits = id.replace(/\D/g, "");
  const target =
    digits.length >= 13
      ? tlv("02", digits)
      : tlv("01", ("0000000000000" + digits.replace(/^0/, "66")).slice(-13));

  let payload =
    tlv("00", "01") +
    tlv("01", amount ? "12" : "11") +
    tlv("29", tlv("00", "A000000677010111") + target) +
    tlv("53", "764") +
    (amount ? tlv("54", amount.toFixed(2)) : "") +
    tlv("58", "TH") +
    "6304";
  payload += crc16(payload);
  return payload;
}
