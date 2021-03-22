# theTangerineBot
Twitch Chat Bot initially created for The Tangerine Club

This bot brings some nice features:
- Approximative translation
- Tangerine World Map
- Automatic Greetings/Shoutout
- Quizz
- And some Smalltalk and weird poems generation
- Chords/notes series generation
- and more..

# Installation



TheTangerineBot is powered by MeteorJs ( https://www.meteor.com )
So basically, to run the bot in a dev environment, you only need to install Meteor, and launch the bot with `meteor` command.


```
meteor
```

in production environment, you have to setup a MongoDB instance. The easiest way to achieve this is to use Docker





# Features

## World Map

As audience on twitch, is world wide, and as a lot of people spontenaously tell in the chat where they come from, the map feature helps to track who's where on our beloved planet. 

### Commands

Following commands are added when Map feature is enabled:

- `!from`: it's the main command. People can tell where they are coming from, for example !from city, country : !from Tokyo, Japan
- `!show`: Allows the nickname of the viewer to be displayed on the public map. By default, nick names are not visible on the public map , only access through a streamer account allows to see all nicknames. !hide command is for hiding the nick name
- `!msg`: it is possible to add a message that will be displayed on the map withi this command. "!msg hello there!" 
- `!map`: to get access to the public map (using the guest account)
- `!forget`: for erasing all data associated with a viewer. Privacy is something important, and it is mandatory to allow people to be able to remove all data about themselves.
- `!neighbours`: will list the nicknames of the 2 or 3 closest people on the map


### Notes

- Locations are shared among all channels, but of course a viewer will only appear if he appears in a channel interacts with the bot. 
The channel where the location was given to the bot with !from command doesn't matter. 

- Locations are used for greeting people entering in the chat, taking account of their language and their local time, when 'automatic greeting mode' is enabled (see next section)

- When someone provides a location, it can take a few minutes before appearing on the map. Especially if a lot of people give their location at the same time. It's because of the conversion from the name of a city to the coordinates (latitude, longitude), which uses a free service, and we don't want to spam this service. 

## Automatic greetings/shoutouts

This feature is a way to greet people entering the chat. It can be either a shoutout, or a simple greeting message. It's basically a database associating the name of a twitch user with a set of messages. Greetings messages are sent once per stream (cooldown is set to 8 hours).  This feature usually requires vip or mod privileges for the bot, as it needs at least to post links and use `!so` command

### Interaction with map

In case twitch users have given their location (on the map), then they can be greeted too, with messages based on their __location and local time__. For example someone living in France, will be greeted in french. And if it's the morning, it can be greeted by 'good morning'. 

Greetings based on user location are independant of the channel. In other words, if the bot knows you, it will greet you on any channel he will meet you! This is a way to make users feel 'at home' when they go to a channel where ttcBot is active. 

Sentences are picked randomly, and some words can be changed, to offer some variation. Shoutout messages can be prefixed by !me to make them more visible. 


## Chords Sequence Generator

This feature was created for musicians who like improvisation challenges. It can be used in combination with channel points for example.
It will basically generate a sequence of notes and chords, with more or less constraints
This command is available only for mods and the broadcaster. 

You can specify hom many notes/chords you want to generate, as first parameter. These commands also accept extra arguments, for constraining the result to a set of note or chords type.

Examples:

```
!notes 8
TheTangerineBot:  G# / G / D / C# / A# / E / A / E

!chords 2
TheTangerineBot: G#69 / E-5b

!chords 4 min
TheTangerineBot: Bmin / D#min / D#min / C#min

!chords 4 A B
TheTangerineBot: Asus4 / A5+ / B-9 / A13

!prog 3
TheTangerineBot: C# ( I III V )

!chords 8 E min sus
TheTangerineBot: Esus / Emin / Emin / Emin / Emin / Emin / Esus / Emin
```


# Credits

- TTCbot logos and emotes were drawn by Cynthia/TheTangerineClub 
