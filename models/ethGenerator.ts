import vanity = require('vanity-eth/libs/VanityEth');

export class EthAddress {
    constructor(public address: string, public privKey: string) { }
    public static Generate(): EthAddress {
        let wallet = vanity.getVanityWallet('FAB', true, false);
        return new EthAddress(wallet.address, wallet.privKey);
    }
}