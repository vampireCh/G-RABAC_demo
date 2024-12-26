const { ethers } = require('ethers');

const message = "Your message here";
const signature = "Signature of the message here";
try {
    const signerAddress = ethers.utils.verifyMessage(message, signature);
    console.log(signerAddress);
} catch (error) {
    console.error(error);
}
