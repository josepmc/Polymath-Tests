import { IssuerTestData } from "tests/issuerTestData";
import { Modal, PolyModal } from "objects/features/general/modal";
import { TransactionResult, Status } from "objects/features/general/transaction";
import { AbstractPage } from "framework/object/abstract";
import { CorePage } from "objects/pages/base";

export class TransactionalTest {
    constructor(public data: IssuerTestData) { }
    public static async ApproveTransactions(clickFn: () => Promise<Modal>, openModal?: Modal, lookForNext: boolean = true): Promise<AbstractPage> {
        let modal = openModal || await clickFn();
        if (!modal) debugger;
        let transaction = await modal.next();
        if (!transaction) debugger;
        while (transaction instanceof Modal) {
            if (transaction instanceof PolyModal) {
                await transaction.handleTransaction();
                modal = await clickFn();
                transaction = await modal.next() as Modal;
            } else transaction = await transaction.next();
        }
        await transaction.refresh('failed');
        if (transaction.failed) throw `Transaction failed`;
        let result: TransactionResult | CorePage;
        while ((result = await transaction.next(lookForNext)) instanceof TransactionResult) {
            if (result.status === Status.Fail) throw `Transaction ${result.name} with ethScan ${result.ethscan} failed`;
        }
        return result;
    }
    public async approveTransactions(clickFn: () => Promise<Modal>, openModal?: Modal, lookForNext: boolean = true): Promise<AbstractPage> {
        return TransactionalTest.ApproveTransactions(clickFn, openModal, lookForNext);
    }
}