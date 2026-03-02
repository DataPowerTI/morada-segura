cronAdd("deleteOldVisitors", "0 0 * * *", () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').split('.')[0];

    // Using a direct SQL query via $app.db() is often most efficient for batch deletions in PocketBase hooks
    $app.db().newQuery("DELETE FROM visitors WHERE entry_time < {:sevenDaysAgo}")
        .bind({ "sevenDaysAgo": sevenDaysAgo })
        .execute();
})
