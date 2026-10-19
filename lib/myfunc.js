function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function smsg(conn, m, store) {
    return m;
}

module.exports = { sleep, smsg };
