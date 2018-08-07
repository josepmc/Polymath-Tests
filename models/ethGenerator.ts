import vanity = require('vanity-eth/libs/VanityEth');

export class EthAddress {
    constructor(public address: string, public privKey: string) { }
    public static Generate(): EthAddress {
        console.log(`Generating ETH Address...`);
        let wallet = vanity.getVanityWallet('FAB', true, false);
        console.log(`Generated ${wallet.address}`);
        return new EthAddress(wallet.address, wallet.privKey);
    }
}