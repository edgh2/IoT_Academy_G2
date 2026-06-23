//Author: Edward

function time_table(number = 1)
{
    for (let i = 1; i <= 10; i++)
    {
        console.log(number + " x " + i + " = " + number*i);
    }
}

function main()
{
    for (let i=1; i<=12; i++)
    {
        time_table(i);
    }
}

main();