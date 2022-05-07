import {SubstrateBlock, SubstrateEvent} from "@subql/types";
import {SumRewardYear, SumRewardMonth, SumRewardDay,Reward, Bonded, Unbonded, SumBondedMonth, SumUnbondedMonth} from "../types";
import {Balance} from '@polkadot/types/interfaces';

function getAccountId(blockNumber: bigint, eventID: string, accountID: string, timestamp: Date, type="no", ){
    let record_id = accountID + '_'

    if(type==="y"){
        record_id = record_id + timestamp.getUTCFullYear()
    } else if(type==="m")  {
        record_id = record_id + timestamp.getUTCFullYear() + '_' + timestamp.getUTCMonth()
    } else if(type==="d") {
        record_id = record_id + timestamp.getUTCFullYear() + '_' + timestamp.getUTCMonth() + '_' + timestamp.getUTCDate()
    } else {
        record_id = record_id + blockNumber + "_" +eventID;
    }
    return record_id
}

function getId(blockNumber: bigint, eventID: string, accountID: string, timestamp: Date, type="no", ){
    let record_id = ''

    if(type==="y"){
        record_id = record_id + timestamp.getUTCFullYear()
    } else if(type==="m")  {
        record_id = record_id + timestamp.getUTCFullYear() + '_' + timestamp.getUTCMonth()
    } else if(type==="d") {
        record_id = record_id + timestamp.getUTCFullYear() + '_' + timestamp.getUTCMonth() + '_' + timestamp.getUTCDate()
    } else {
        record_id = record_id + blockNumber + "_" +eventID;
    }
    return record_id
}


export async function handleRewarded(event: SubstrateEvent): Promise<void> {
    logger.info("====> event record=> " + JSON.stringify(event))
    let blockNumber = event.block.block.header.number.toBigInt();
    let timestamp = event.block.timestamp;
    const {event: {data: [account, newReward]}} = event;
    let eventID = event.phase.asApplyExtrinsic.toString()
    let amount = (newReward as Balance).toBigInt();

    await saveSumRewardYear(timestamp, blockNumber, account.toString(), amount, eventID)
    await saveSumRewardMonth(timestamp, blockNumber, account.toString(), amount, eventID)
    await saveSumRewardDay(timestamp, blockNumber, account.toString(), amount, eventID)
    await saveReward(timestamp, blockNumber, account.toString(), amount, eventID)
}

export async function handleBonded(event: SubstrateEvent): Promise<void> {
    logger.info("====> event record=> " + JSON.stringify(event))
    let blockNumber = event.block.block.header.number.toBigInt();
    let timestamp = event.block.timestamp;
    const {event: {data: [account, newReward]}} = event;
    let eventID = event.phase.asApplyExtrinsic.toString()
    let amount = (newReward as Balance).toBigInt();

    await saveBonded(timestamp, blockNumber, account.toString(), amount, eventID)
    await saveSumBondedMonth(timestamp, blockNumber, account.toString(), amount, eventID)
}

export async function handleUnbonded(event: SubstrateEvent): Promise<void> {
    logger.info("====> event record=> " + JSON.stringify(event))
    let blockNumber = event.block.block.header.number.toBigInt();
    let timestamp = event.block.timestamp;
    const {event: {data: [account, newReward]}} = event;
    let eventID = event.phase.asApplyExtrinsic.toString()
    let amount = (newReward as Balance).toBigInt();

    await saveUnbonded(timestamp, blockNumber, account.toString(), amount, eventID)
    await saveSumUnbondedMonth(timestamp, blockNumber, account.toString(), amount, eventID)
}

export async function saveSumRewardYear(timestamp: Date, blockNumber: bigint, account: string, amount: bigint, eventID: string): Promise<void> {
    let id = getAccountId(blockNumber, eventID, account, timestamp, 'y')
    logger.info("Saving SumRewardYear for id!: " + id);

    let record = await SumRewardYear.get(id);
    if (!record) {
        record = SumRewardYear.create({
            id: id,
            account: account,
            blockNumber: blockNumber,
            timestamp: timestamp
        });
    }
    
    record.amount = record.amount?record.amount+BigInt(amount):BigInt(amount);
    record.blockNumber = blockNumber;
    record.timestamp = timestamp;
    record.txCount = record.txCount?record.txCount+BigInt(1):BigInt(1);
    await record.save().then((res) => {
        //logger.info("SumRewardYear added/saved =>"+ res)
    })
    .catch((err) => {
        logger.info("SumRewardYear added/saved error => " + err)
    });
}

export async function saveSumRewardMonth(timestamp: Date, blockNumber: bigint, account: string, amount: bigint, eventID: string): Promise<void> {
    let id = getAccountId(blockNumber, eventID, account, timestamp, 'm')
    logger.info("Saving SumRewardMonth for id!: " + id);

    let record = await SumRewardMonth.get(id);
    if (!record) {
        record = SumRewardMonth.create({
            id: id,
            account: account,
            blockNumber: blockNumber,
            timestamp: timestamp

        });
    }

    record.amount = record.amount?record.amount+BigInt(amount):BigInt(amount);
    record.blockNumber = blockNumber;
    record.timestamp = timestamp;
    record.txCount = record.txCount?record.txCount+BigInt(1):BigInt(1);
    await record.save().then((res) => {
        //logger.info("SumRewardMonth added/saved =>"+ res)
    })
    .catch((err) => {
        logger.info("SumRewardMonth  err => " + err)
    });
}

export async function saveSumRewardDay(timestamp: Date, blockNumber: bigint, account: string, amount: bigint, eventID: string): Promise<void> {
    let id = getAccountId(blockNumber, eventID, account, timestamp, 'd')
    logger.info("Saving SumRewardDay for id!: " + id);

    let rewardMonth = await getSumRewardMonth(timestamp, blockNumber, account, amount, eventID)
    let rewardYear = await getSumRewardYear(timestamp, blockNumber, account, amount, eventID)

    let monthAgo=new Date(timestamp.valueOf())
    monthAgo.setUTCMonth(timestamp.getUTCMonth()-1)
    let rewardLastMonth = await getSumRewardLastMonth(monthAgo, blockNumber, account, amount, eventID)

    let yearAgo=new Date(timestamp.valueOf())
    yearAgo.setUTCFullYear(timestamp.getUTCFullYear()-1)
    let rewardLastYear = await getSumRewardLastYear(yearAgo, blockNumber, account, amount, eventID)

    let record = await SumRewardDay.get(id);
    if (!record) {
        record = SumRewardDay.create({
            id: id,
            account: account ,
            blockNumber: blockNumber,
            timestamp: timestamp,
            sumRewardMonthId: rewardMonth.id,
            sumRewardYearId: rewardYear.id
        });
    }
    record.amount = record.amount?record.amount+BigInt(amount):BigInt(amount);
    record.blockNumber = blockNumber;
    record.timestamp = timestamp;
    record.txCount = record.txCount?record.txCount+BigInt(1):BigInt(1);
    record.sumRewardMonthId = rewardMonth.id
    record.sumRewardYearId = rewardYear.id
    if (rewardLastMonth) {
       record.sumRewardLastMonthId = rewardLastMonth.id
    }
    if (rewardLastYear) {
        record.sumRewardLastYearId = rewardLastYear.id
    }

    await record.save().then((res) => {
        //logger.info("SumRewardDay added/saved =>"+ res)
    })
    .catch((err) => {
        logger.info("SumRewardDay err => " + err)
    });
}

export async function saveReward(timestamp: Date, blockNumber: bigint, account: string, amount: bigint, eventID: string): Promise<void> {
    let id = getAccountId(blockNumber, eventID, account, timestamp, '')
    logger.info("Saving Reward for id!: " + id);

    let record = await Reward.get(id);
    if (!record) {
        record = Reward.create({
            id: id,
            account: account,
            blockNumber: blockNumber,
            timestamp: timestamp
        });
    }
    record.amount = amount as unknown as bigint;
    record.blockNumber = blockNumber;
    record.timestamp = timestamp;

    await record.save().then((res) => {
        //logger.info("Reward added/saved =>"+ res)
    })
    .catch((err) => {
        logger.info("Reward err => " + err)
    });
}
 
export async function saveBonded(timestamp: Date, blockNumber: bigint, account: string, amount: bigint, eventID: string): Promise<void> {
    let id = getAccountId(blockNumber, eventID, account, timestamp, '')
    logger.info("Saving Bonded for id!: " + id);

    let record = await Bonded.get(id);
    if (!record) {
        record = Bonded.create({
            id: id,
            account: account,
            blockNumber: blockNumber,
            timestamp: timestamp
        });
    }
    record.amount = amount as unknown as bigint;
    record.blockNumber = blockNumber;
    record.timestamp = timestamp;

    await record.save().then((res) => {
        //logger.info("Reward added/saved =>"+ res)
    })
    .catch((err) => {
        logger.info("Bonded err => " + err)
    });
}

export async function saveSumBondedMonth(timestamp: Date, blockNumber: bigint, account: string, amount: bigint, eventID: string): Promise<void> {
    let id = getId(blockNumber, eventID, account, timestamp, 'm')
    logger.info("Saving SumBondedMonth for id!: " + id);

    let record = await SumBondedMonth.get(id);
    if (!record) {
        record = SumBondedMonth.create({
            id: id,
            account: account,
            blockNumber: blockNumber,
            timestamp: timestamp
        });
    }
    record.amount = record.amount?record.amount+BigInt(amount):BigInt(amount);
    record.blockNumber = blockNumber;
    record.timestamp = timestamp;

    await record.save().then((res) => {
        //logger.info("Reward added/saved =>"+ res)
    })
    .catch((err) => {
        logger.info("SumBondedMonth err => " + err)
    });
}

export async function saveUnbonded(timestamp: Date, blockNumber: bigint, account: string, amount: bigint, eventID: string): Promise<void> {
    let id = getAccountId(blockNumber, eventID, account, timestamp, '')
    logger.info("Saving Unbonded for id!: " + id);

    let record = await Unbonded.get(id);
    if (!record) {
        record = Unbonded.create({
            id: id,
            account: account,
            blockNumber: blockNumber,
            timestamp: timestamp
        });
    }
    record.amount = amount as unknown as bigint;
    record.blockNumber = blockNumber;
    record.timestamp = timestamp;

    await record.save().then((res) => {
        //logger.info("Reward added/saved =>"+ res)
    })
    .catch((err) => {
        logger.info("Unbonded err => " + err)
    });
}

export async function saveSumUnbondedMonth(timestamp: Date, blockNumber: bigint, account: string, amount: bigint, eventID: string): Promise<void> {
    let id = getId(blockNumber, eventID, account, timestamp, 'm')
    logger.info("Saving SumUnbondedMonth for id!: " + id);

    let record = await SumUnbondedMonth.get(id);
    if (!record) {
        record = SumUnbondedMonth.create({
            id: id,
            account: account,
            blockNumber: blockNumber,
            timestamp: timestamp
        });
    }
    record.amount = record.amount?record.amount+BigInt(amount):BigInt(amount);
    record.blockNumber = blockNumber;
    record.timestamp = timestamp;

    await record.save().then((res) => {
        //logger.info("Reward added/saved =>"+ res)
    })
    .catch((err) => {
        logger.info("SumUnbondedMonth err => " + err)
    });
}

export async function getSumRewardMonth(timestamp: Date, blockNumber: bigint, account: string, amount: bigint, eventID: string): Promise<SumRewardMonth> {
    let monthId = getAccountId(blockNumber, eventID, account, timestamp, 'm')
    return await SumRewardMonth.get(monthId)
}

export async function getSumRewardYear(timestamp: Date, blockNumber: bigint, account: string, amount: bigint, eventID: string): Promise<SumRewardYear> {
    let yearId = getAccountId(blockNumber, eventID, account, timestamp, 'y')
    return await SumRewardYear.get(yearId)
}

export async function getSumRewardLastMonth(timestamp: Date, blockNumber: bigint, account: string, amount: bigint, eventID: string): Promise<SumRewardMonth> {
    //logger.info("Month before " + timestamp)
    //timestamp.setUTCMonth(timestamp.getUTCMonth()-1)
    logger.info("Month " + timestamp)
    let monthId = getAccountId(blockNumber, eventID, account, timestamp, 'm')
    return await SumRewardMonth.get(monthId)
}

export async function getSumRewardLastYear(timestamp: Date, blockNumber: bigint, account: string, amount: bigint, eventID: string): Promise<SumRewardYear> {
    //logger.info("Year before " + timestamp)
    //timestamp.setUTCFullYear(timestamp.getUTCFullYear()-1)
    logger.info("Year " + timestamp)
    let yearId = getAccountId(blockNumber, eventID, account, timestamp, 'y')
    return await SumRewardYear.get(yearId)
}