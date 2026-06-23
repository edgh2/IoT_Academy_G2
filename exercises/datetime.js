//Author: Edward

function main()
{
    const d1 = new Date();
    for(let i=0; i<1000; i++)
    {
        const d = new Date();
        console.log(d.getMilliseconds());
    }
    const d2 = new Date();
    console.log("time elapsed: " + (d2.getMilliseconds() - d1.getMilliseconds()));

    const bd = new Date("2020-01-02 10:20:12");
    console.log("Age : " + ((d2 - bd) / 3600000 / 24 ));
}

main();