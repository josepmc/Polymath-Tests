import vanity = require('vanity-eth/libs/VanityEth');

interface Wallet {
    address: string;
    privKey: string;
}

export class EthAddress {
    public static prefix: string = '';
    public address: string;
    public privKey: string;
    constructor(public wallet: Wallet) {
        this.address = wallet.address;
        this.privKey = wallet.privKey;
    }
    public static Generate(): EthAddress {
        console.log(`Generating ETH Address...`);
        let wallet = vanity.getVanityWallet(EthAddress.prefix, true, false);
        console.log(`Generated ${wallet.address}`);
        return new EthAddress(wallet);
    }
}