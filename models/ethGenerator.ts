import vanity = require('vanity-eth/libs/VanityEth');

export class EthAddress {
    public static prefix: string = 'FAB';
    constructor(public address: string, public privKey: string) { }
    public static Generate(): EthAddress {
        console.log(`Generating ETH Address...`);
        let wallet = vanity.getVanityWallet(EthAddress.prefix, true, false);
        console.log(`Generated ${wallet.address}`);
        return new EthAddress(wallet.address, wallet.privKey);
    }
}