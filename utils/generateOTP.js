// Generates a unique 4-digit numeric OTP on each call.
// Keeps an in-memory set of previously generated OTPs and resets when exhausted.

const GENERATED = new Set();

function pad4(n) {
    return n.toString().padStart(4, '0');
}

function generateRandom4Digit() {
    return Math.floor(Math.random() * 10000); // 0..9999
}

function generateOTP() {
    if (GENERATED.size >= 10000) {
        // all possible OTPs used; clear to allow reuse
        GENERATED.clear();
    }

    let attempts = 0;
    while (attempts < 10000) {
        const n = generateRandom4Digit();
        const otp = pad4(n);
        if (!GENERATED.has(otp)) {
            GENERATED.add(otp);
            return otp;
        }
        attempts++;
    }

    // fallback: linear scan for any free OTP
    for (let i = 0; i < 10000; i++) {
        const otp = pad4(i);
        if (!GENERATED.has(otp)) {
            GENERATED.add(otp);
            return otp;
        }
    }

    // should not reach here, but return random padded value
    return pad4(generateRandom4Digit());
}

module.exports = {generateOTP};
