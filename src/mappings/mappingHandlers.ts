import {SubstrateBlock} from "@subql/types";
import {SumRewardYear, SumRewardMonth, SumRewardDay,Reward} from "../types";

function getId(eventID: string, accountID: string, timestamp: Date | number, type="no", ){
    let date = new Date(timestamp)
    let record_id = accountID + '_'
    
    if(type==="y"){
        record_id = record_id + (typeof(timestamp)==="number"?timestamp:date.getFullYear())
    } else if(type==="m")  {
        record_id = record_id + date.getFullYear() + '_' + date.getMonth()
    } else if(type==="d") {
        record_id = record_id + date.getFullYear() + '_' + date.getMonth() + '_' + date.getDate()
    } else {
        record_id = record_id + eventID;
    }
    return record_id
}

export async function handleBlock(block: SubstrateBlock): Promise<void> {    
    let blockNumber = block.block.header.number.toBigInt();

    let events = block.events;
    for (let i = 0; i < events.length; i++) {
        let eventRecord = events[i];
        let method = eventRecord.event.method
        let section = eventRecord.event.section

        if (section="staking") {
            switch (method) {
                case "Rewarded":
                    logger.info("====> event record => "+eventRecord.event.toJSON())
                    const [account, amount] = eventRecord.event.data.toJSON() as [string, bigint];
                    let eventID = eventRecord.event.index.toString()

                    await saveSumRewardYear(block.timestamp, blockNumber, account, amount, eventID)
                    await saveSumRewardMonth(block.timestamp, blockNumber, account, amount, eventID)
                    await saveSumRewardDay(block.timestamp, blockNumber, account, amount, eventID)
                    await saveReward(block.timestamp, blockNumber, account, amount, eventID)

                    break;
                default:
                    break;
            }
        }

    }
}

export async function saveSumRewardYear(timestamp: Date, blockNumber: bigint, account: string, amount: bigint, eventID: string): Promise<void> {
    logger.info("Saving SumRewardYear for account!: " + account);
    let id = getId(eventID, account, timestamp, 'y')

    let record = await SumRewardYear.get(id);
    if (!record) {
        record = SumRewardYear.create({
            id: id,
            amount: amount,
            account: account,
            blockNumber: blockNumber,
            timestamp: timestamp

        });
    }
    
    record.amount = record.amount?record.amount+amount:amount;
    record.blockNumber = blockNumber;
    record.timestamp = timestamp;

    await record.save().then((res) => {
        logger.info("SumRewardYear added/saved =>"+ res)
    })
    .catch((err) => {
        logger.info("SumRewardYear added/saved error => " + err)
    });
}

export async function saveSumRewardMonth(timestamp: Date, blockNumber: bigint, account: string, amount: bigint, eventID: string): Promise<void> {
    logger.info("Saving SumRewardMonth for account!: " + account);
    let id = getId(eventID, account, timestamp, 'm')

    let record = await SumRewardMonth.get(id);
    if (!record) {
        record = SumRewardMonth.create({
            id: id,
            amount: amount,
            account: account,
            blockNumber: blockNumber,
            timestamp: timestamp

        });
    }

    record.amount = record.amount?record.amount+amount:amount;
    record.blockNumber = blockNumber;
    record.timestamp = timestamp;

    await record.save().then((res) => {
        logger.info("SumRewardMonth added/saved =>"+ res)
    })
    .catch((err) => {
        logger.info("SumRewardMonth  err => " + err)
    });
}

export async function saveSumRewardDay(timestamp: Date, blockNumber: bigint, account: string, amount: bigint, eventID: string): Promise<void> {
    logger.info("Saving SumRewardDay for account!: " + account);
    let id = getId(eventID, account, timestamp, 'd')

    let rewardMonth = await getSumRewardMonth(timestamp, blockNumber, account, amount, eventID)
    let rewardYear = await getSumRewardYear(timestamp, blockNumber, account, amount, eventID)

    let record = await SumRewardDay.get(id);
    if (!record) {
        record = SumRewardDay.create({
            id: id,
            amount: amount,
            account: account,
            blockNumber: blockNumber,
            timestamp: timestamp,
            sumRewardMonthId: rewardMonth.id,
            sumRewardYearId: rewardYear.id
        });
    }
    record.amount = record.amount?record.amount+amount:amount;
    record.blockNumber = blockNumber;
    record.timestamp = timestamp;

    record.sumRewardMonthId = rewardMonth.id
    record.sumRewardYearId = rewardYear.id

    await record.save().then((res) => {
        logger.info("SumRewardDay added/saved =>"+ res)
    })
    .catch((err) => {
        logger.info("SumRewardDay err => " + err)
    });
}

export async function saveReward(timestamp: Date, blockNumber: bigint, account: string, amount: bigint, eventID: string): Promise<void> {
    logger.info("Saving Reward for account!: " + account);
    let id = getId(eventID, account, timestamp, '')

    let record = await Reward.get(id);
    if (!record) {
        record = Reward.create({
            id: id,
            account: account,
            blockNumber: blockNumber,
            timestamp: timestamp
        });
    }
    record.amount = record.amount;
    record.blockNumber = blockNumber;
    record.timestamp = timestamp;

    await record.save().then((res) => {
        logger.info("Reward added/saved =>"+ res)
    })
    .catch((err) => {
        logger.info("Reward err => " + err)
    });
}
 
export async function getSumRewardMonth(timestamp: Date, blockNumber: bigint, account: string, amount: bigint, eventID: string): Promise<SumRewardMonth> {
    let monthId = getId(eventID, account, timestamp, 'm')
    return await SumRewardMonth.get(monthId)
}

export async function getSumRewardYear(timestamp: Date, blockNumber: bigint, account: string, amount: bigint, eventID: string): Promise<SumRewardYear> {
    let yearId = getId(eventID, account, timestamp, 'y')
    return await SumRewardYear.get(yearId)
}