const { SlashCommandBuilder } = require('discord.js');

// You can expand this array with more quotes
const animeQuotes = [
    { quote: "I'll take a potato chip... and eat it!", character: "Light Yagami", anime: "Death Note" },

    { quote: "If you don't like your destiny, don't accept it.", character: "Naruto Uzumaki", anime: "Naruto" },

    { quote: "Whatever you lose, you'll find it again. But what you throw away you'll never get back.", character: "Himura Kenshin", anime: "Rurouni Kenshin" },

    { quote: "The world isn't perfect. But it's there for us, doing the best it can.", character: "Roy Mustang", anime: "Fullmetal Alchemist" },

    { quote: "I'm not a monster. I'm just ahead of the curve.", character: "Saitama", anime: "One Punch Man" },

    {quote: "People’s lives don’t end when they die. It ends when they lose faith.", character: "Itachi Uchiha", anime: "Naruto"},

    { quote: "If you don’t take risks, you can’t create a future.", character: "Monkey D. Luffy", anime: "One Piece" },

    { quote: "Power comes in response to a need, not a desire.", character: "Goku", anime: "Dragon Ball Z" },

    { quote: "The world isn’t perfect. But it’s there for us, doing the best it can…that’s what makes it so damn beautiful.", character: "Roy Mustang", anime: "Fullmetal Alchemist" },

    { quote: "You should enjoy the little detours. To the fullest. Because that’s where you’ll find the things more important than what you want.", character: "Ging Freecss", anime: "Hunter x Hunter" },

    { quote: "You don’t win alone. That’s just how it is.", character: "Kageyama Tobio", anime: "Haikyuu!!" },

    { quote: "No matter how deep the night, it always turns to day, eventually.", character: "Brook", anime: "One Piece" },

    { quote: "People become stronger because they have memories they can’t forget.", character: "Tsunade", anime: "Naruto" },

    { quote: "If you can’t do something, then don’t. Focus on what you can do.", character: "Shiroe", anime: "Log Horizon" },

    { quote: "In our society, letting others find out that you’re a nice person is a very risky move. It’s extremely likely that someone would take advantage of that.", character: "Hitagi Senjougahara", anime: "Monogatari Series" },

    { quote: "Whatever you lose, you’ll find it again. But what you throw away you’ll never get back.", character: "Himura Kenshin", anime: "Rurouni Kenshin" },

    { quote: "The moment you think of giving up, think of the reason why you held on so long.", character: "Natsu Dragneel", anime: "Fairy Tail" },

    { quote: "Even if we forget the faces of our friends, we will never forget the bonds that were carved into our souls.", character: "Otonashi Yuzuru", anime: "Angel Beats!" },
    { quote: "People’s lives don’t end when they die, it ends when they lose faith.", character: "Itachi Uchiha", anime: "Naruto" },


    { quote: "The world isn’t perfect. But it’s there for us, doing the best it can…that’s what makes it so damn beautiful.", character: "Roy Mustang", anime: "Fullmetal Alchemist" },

    { quote: "It’s not the face that makes someone a monster; it’s the choices they make with their lives.", character: "Naruto Uzumaki", anime: "Naruto" },

    { quote: "You can’t sit around envying other people’s worlds. You have to go out and change your own.", character: "Shinichi Izumi", anime: "Parasyte" },

    { quote: "Those who stand at the top determine what’s wrong and what’s right! This very place is neutral ground! Justice will prevail, you say? But of course it will! Whoever wins this war becomes justice!", character: "Donquixote Doflamingo", anime: "One Piece" },

    { quote: "There’s no shame in falling down! True shame is to not stand up again!", character: "Shintaro Midorima", anime: "Kuroko no Basket" },

    { quote: "The world is not beautiful, therefore it is.", character: "Kino", anime: "Kino's Journey" },

    { quote: "Reject common sense to make the impossible possible!", character: "Simon", anime: "Tengen Toppa Gurren Lagann" },

    { quote: "If you can’t do something, then don’t. Focus on what you can do.", character: "Shiroe", anime: "Log Horizon" },

    { quote: "A lesson without pain is meaningless. That’s because no one can gain without sacrificing something.", character: "Edward Elric", anime: "Fullmetal Alchemist: Brotherhood" },

    { quote: "We are all like fireworks. We climb, we shine and always go our separate ways and become further apart. But even if that time comes, let’s not disappear like a firework and continue to shine forever.", character: "Hitsugaya Toshiro", anime: "Bleach" },

    { quote: "You should enjoy the little detours. To the fullest. Because that’s where you’ll find the things more important than what you want.", character: "Ging Freecss", anime: "Hunter x Hunter" },

    { quote: "I’ll leave tomorrow’s problems to tomorrow’s me.", character: "Saitama", anime: "One Punch Man" },

    { quote: "No matter how many weapons you have, no matter how great your technology might be, the world cannot live without love!", character: "Sheeta", anime: "Castle in the Sky" },

    { quote: "Whatever you do, enjoy it to the fullest. That is the secret of life.", character: "Rider", anime: "Fate/Zero" },

    { quote: "To know sorrow is not terrifying. What is terrifying is to know you can’t go back to happiness you could have.", character: "Matsumoto Rangiku", anime: "Bleach" },

    { quote: "Whether a fish lives in a clear stream or a water ditch, so long as it continues swimming forward, it will grow up beautifully.", character: "Koro-sensei", anime: "Assassination Classroom" },

    { quote: "The only thing we’re allowed to do is to believe that we won’t regret the choice we made.", character: "Levi Ackerman", anime: "Attack on Titan" },
    { quote: "Hurt me with the truth. But never comfort me with a lie.", character: "Erza Scarlet", anime: "Fairy Tail" },

    { quote: "Every journey begins with a single step. We just have to have patience.", character: "Milim Nava", anime: "That Time I Got Reincarnated as a Slime" },

    { quote: "If you only face forward, there is something you will miss seeing.", character: "Vash the Stampede", anime: "Trigun" },

    { quote: "Life is not a game of luck. If you wanna win, work hard.", character: "Sora", anime: "No Game No Life" },

    { quote: "No matter how deep the night, it always turns to day, eventually.", character: "Brook", anime: "One Piece" },

    { quote: "The moment you think of giving up, think of the reason why you held on so long.", character: "Natsu Dragneel", anime: "Fairy Tail" },

    { quote: "If you can’t find a reason to fight, then you shouldn’t be fighting.", character: "Akame", anime: "Akame Ga Kill!" },

    { quote: "If you really want to be strong… Stop caring about what your surrounding thinks of you!", character: "Saitama", anime: "One Punch Man" },

    { quote: "The only thing we're allowed to do is believe that we won't regret the choice we made.", character: "Levi Ackerman", anime: "Attack on Titan" },

    { quote: "People who can’t throw something important away, can never hope to change anything.", character: "Armin Arlert", anime: "Attack on Titan" },

    { quote: "To know sorrow is not terrifying. What is terrifying is to know you can’t go back to happiness you could have.", character: "Matsumoto Rangiku", anime: "Bleach" },

    { quote: "It’s okay not to be okay as long as you’re not giving up.", character: "Karen Aijou", anime: "Revue Starlight" },

    { quote: "Forgetting is like a wound. The wound may heal, but it has already left a scar.", character: "Monkey D. Luffy", anime: "One Piece" },

    { quote: "A person’s true power emerges when they try to protect someone important.", character: "Haku", anime: "Naruto" },

    { quote: "If you want to make people dream, you’ve got to start by believing in that dream yourself!", character: "Seiya Kanie", anime: "Amagi Brilliant Park" },
    
    { quote: "You’re going to carry that weight.", character: "Spike Spiegel", anime: "Cowboy Bebop" },
    
    { quote: "A lesson without pain is meaningless. That’s because no one can gain without sacrificing something.", character: "Edward Elric", anime: "Fullmetal Alchemist: Brotherhood" },

    { quote: "Those who forgive themselves, and are able to accept their true nature… They are the strong ones!", character: "Itachi Uchiha", anime: "Naruto" },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('animequote')
        .setDescription('Sends a random anime quote'),
    
    async execute(interaction) {
        const randomQuote = animeQuotes[Math.floor(Math.random() * animeQuotes.length)];
        
        await interaction.reply({
            embeds: [{
                color: 0x0099ff,
                title: 'Anime Quote',
                description: `"${randomQuote.quote}"`,
                fields: [
                    { name: 'Character', value: randomQuote.character, inline: true },
                    { name: 'Anime', value: randomQuote.anime, inline: true }
                ]
            }]
        });
    },
}; 