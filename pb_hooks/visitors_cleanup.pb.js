cronAdd("deleteOldPhotos", "0 0 * * *", () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').split('.')[0];

    // Clear photos from people who haven't been updated (visited) in 7 days
    $app.db().newQuery("UPDATE people SET photo = '' WHERE updated < {:sevenDaysAgo} AND photo != ''")
        .bind({ "sevenDaysAgo": sevenDaysAgo })
        .execute();

    // Optionally also clear legacy photos directly on the access tables if they exist
    // This is useful during the transition period before all data uses the people table
    ["visitors", "service_providers", "rental_guests"].forEach(table => {
        try {
            $app.db().newQuery(`UPDATE ${table} SET photo = '' WHERE created < {:sevenDaysAgo} AND photo != ''`)
            .bind({ "sevenDaysAgo": sevenDaysAgo })
            .execute();
        } catch(e) {}
    });

    console.log("Ran scheduled task: cleared old photos from people and access logs");
})
