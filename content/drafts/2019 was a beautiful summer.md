---
publish: "false"
tags:
  - journal
  - AI
---

I found myself hired by CHAI in my dream position. I had begun to wonder why [[attainable utility preservation]] was so effective. Understand it, I begin thinking about the structure of Markov decision processes (MDPs)---an RL formalism for a policy's environment. 

It was a beautiful summer. I found myself dreamily wandering the streets of Berkeley, listening to haunting and beautiful renditions of J.R.R. Tolkien’s poetry.


> [!Quote]-   The Short Lay of Eärendil: Eärendillinwë, _Lord of the Rings_
> Performed by [Clamavi de Profundis](https://www.youtube.com/watch?v=4ybSi5EcZ3M):
> <audio src="https://pub-c1163bffee9f4c50ba3c9a13f0e9ac93.r2.dev/The%20Song%20of%20Ea%CC%88rendil.webm" alt="The song of Eärendil, as performed by Clamavi de Profundis." controls></audio><br>
> >[!Quote] [Lord of the Rings wiki](https://lotr.fandom.com/wiki/E%C3%A4rendil)
> >
> >Eärendil was a great Half-elf mariner who voyaged to Valinor, entreated before the Valar on behalf of the Children of Ilúvatar, and carried a star across the sky at the end of the First Age. His acts had been prophesied of among the Elves centuries beforehand.
> <hr>
>   Eärendil was a mariner<br>
>   that tarried in Arvernien;<br>
>   he built a boat of timber felled<br>
>   in Nimbrethil to journey in;<br>
>   her sails he wove of silver fair,<br>
>   of silver were her lanterns made,<br>
>   her prow was fashioned like a swan,<br>
>   and light upon her banners laid.<br>
>   <br>
>   In panoply of ancient kings,<br>
>   in chainéd rings he armoured him;<br>
>   his shining shield was scored with runes<br>
>   to ward all wounds and harm from him;<br>
>   his bow was made of dragon-horn,<br>
>   his arrows shorn of ebony;<br>
>   of silver was his habergeon,<br>
>   his scabbard of chalcedony;<br>
>   his sword of steel was valiant,<br>
>   of adamant his helmet tall,<br>
>   an eagle-plume upon his crest,<br>
>   upon his breast an emerald.<br>
>   <br>
>   Beneath the Moon and under star<br>
>   he wandered far from northern strands,<br>
>   bewildered on enchanted ways<br>
>   beyond the days of mortal lands.<br>
>   From gnashing of the Narrow Ice<br>
>   where shadow lies on frozen hills,<br>
>   from nether heats and burning waste<br>
>   he turned in haste, and roving still<br>
>   on starless waters far astray<br>
>   at last he came to Night of Naught,<br>
>   and passed, and never sight he saw<br>
>   of shining shore nor light he sought.<br>
>   The winds of wrath came driving him,<br>
>   and blindly in the foam he fled<br>
>   from west to east and errandless,<br>
>   unheralded he homeward sped.<br>
>   <br>
>   There flying Elwing came to him,<br>
>   and flame was in the darkness lit;<br>
>   more bright than light of diamond<br>
>   the fire upon her carcanet.<br>
>   The Silmaril she bound on him<br>
>   and crowned him with the living light<br>
>   and dauntless then with burning brow<br>
>   he turned his prow; and in the night<br>
>   from Otherworld beyond the Sea<br>
>   there strong and free a storm arose,<br>
>   a wind of power in Tarmenel;<br>
>   by paths that seldom mortal goes<br>
>   his boat it bore with biting breath<br>
>   as might of death across the grey<br>
>   and long forsaken seas distressed;<br>
>   from east to west he passed away.<br>
>   <br>
>   Through Evernight he back was borne<br>
>   on black and roaring waves that ran<br>
>   o'er leagues unlit and foundered shores<br>
>   that drowned before the Days began,<br>
>   until he heard on strands of pearl<br>
>   where ends the world the music long,<br>
>   where ever-foaming billows roll<br>
>   the yellow gold and jewels wan.<br>
>   He saw the Mountain silent rise<br>
>   where twilight lies upon the knees<br>
>   of Valinor, and Eldamar<br>
>   beheld afar beyond the seas.<br>
>   A wanderer escaped from night<br>
>   to haven white he came at last,<br>
>   to Elvenhome the green and fair<br>
>   where keen the air, where pale as glass<br>
>   beneath the Hill of Ilmarin<br>
>   a-glimmer in a valley sheer<br>
>   the lamplit towers of Tirion<br>
>   are mirrored on the Shadowmere.<br>
>   <br>
>   He tarried there from errantry,<br>
>   and melodies they taught to him,<br>
>   and sages old him marvels told,<br>
>   and harps of gold they brought to him.<br>
>   They clothed him then in elven-white,<br>
>   and seven lights before him sent,<br>
>   as through the Calacirian<br>
>   to hidden land forlorn he went.<br>
>   He came unto the timeless halls<br>
>   where shining fall the countless years,<br>
>   and endless reigns the Elder King<br>
>   in Ilmarin on Mountain sheer;<br>
>   and words unheard were spoken then<br>
>   of folk of Men and Elven-kin,<br>
>   beyond the world were visions showed<br>
>   forbid to those that dwell therein.<br>
>
>   <span className="elvish-italics" alt="This elvish-italics was added by Clamavi de Profundis.">A elbereth gilthoniel!</span> 
> <br>
>   <span className="elvish-italics">Silivren penna míriel</span>
> <br>
>   <span className="elvish-italics">o menel aglar elenath</span>
> <br>
>   <span className="elvish-italics">Gilthoniel, a! Elbereth!</span><br>
>   <br>
>   A ship then new they built for him<br>
>   of mithril and of elven-glass<br>
>   with shining prow; no shaven oar<br>
>   nor sail she bore on silver mast:<br>
>   the Silmaril as lantern light<br>
>   and banner bright with living flame<br>
>   to gleam thereon by Elbereth<br>
>   herself was set, who thither came<br>
>   and wings immortal made for him,<br>
>   and laid on him undying doom,<br>
>   to sail the shoreless skies and come<br>
>   behind the Sun and light of Moon.<br>
>   <br>
>   From Evereven's lofty hills<br>
>   where softly silver fountains fall<br>
>   his wings him bore, a wandering light,<br>
>   beyond the mighty Mountain Wall.<br>
>   From World's End there he turned away,<br>
>   and yearned again to find afar<br>
>   his home through shadows journeying,<br>
>   and burning as an island star<br>
>   on high above the mists he came,<br>
>   a distant flame before the Sun,<br>
>   a wonder ere the waking dawn<br>
>   where grey the Norland waters run.<br>
>   <br>
>   And over Middle-earth he passed<br>
>   and heard at last the weeping sore<br>
>   of women and of elven-maids<br>
>   in Elder Days, in years of yore.<br>
>   But on him mighty doom was laid,<br>
>   till Moon should fade, an orbéd star<br>
>   to pass, and tarry never more<br>
>   on Hither Shores where Mortals are;<br>
>   for ever still a herald on<br>
>   an errand that should never rest<br>
>   to bear his shining lamp afar,<br>
>   the Flammifer of Westernesse.

I started thinking about state visit distributions. I was enamored. I'd never heard of anyone think about environments this way, I had never read any theory like it. At most, these visit distributions seem to be regarded as tools used to prove regret bounds, and not as the deep and fundamental objects they are. It felt to me as though I'd walk down a busy street and looked to the side only to find an opening to a beautiful clearing, completely devoid of people I would cautiously look back down the street – was anyone else seeing this? But no, no one else was seeing this. I explored this clearing, proving dozens of fundamental and basic and straightforward results about reinforcement learning – how optimal policies changed as you changed the discount rate, our entire environment itself can be encoded in just a handful of these vectors – equivalent theorem, in my eyes.