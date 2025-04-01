const Pool = require('../model/pool/poolModel');

async function generateUniqueInvitationCode() {
    let code;
    let isCodeUnique = false;

    // Generate a unique invitation code
    while (!isCodeUnique) {
        code = Math.random().toString(36).substr(2, 8).toUpperCase();
        const existingPool = await Pool.findOne({ invitationCode: code });
        if (!existingPool) {
            isCodeUnique = true;
        }
    }

    return code;
}

module.exports = generateUniqueInvitationCode;
