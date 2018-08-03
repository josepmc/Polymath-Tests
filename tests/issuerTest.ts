import { IssuerTestData } from "tests/issuerTestData";
import { Modal, PolyModal } from "objects/features/general/modal";
import { TransactionResult } from "objects/features/general/transaction";
import { AbstractPage } from "framework/object/abstract";

export class IssuerTest {
    constructor(public data: IssuerTestData) { }
    public static async ApproveTransactions(clickFn: () => Promise<Modal>, openModal?: Modal): Promise<AbstractPage> {
        let modal = openModal || await clickFn();
        let transaction = await modal.next();
        while (transaction instanceof Modal) {
            if (transaction instanceof PolyModal) {
                await transaction.handleTransaction();
                modal = await clickFn();
                transaction = await modal.next() as Modal;
            } else transaction = await transaction.next();
        }
        let result;
        while ((result = await transaction.next()) instanceof TransactionResult) { }
        return result;
    }
    public async approveTransactions(clickFn: () => Promise<Modal>, openModal?: Modal): Promise<AbstractPage> {
        return IssuerTest.ApproveTransactions(clickFn, openModal);
    }
}