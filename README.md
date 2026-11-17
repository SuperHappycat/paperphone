# Paper Phone, web edition

A printable Paper Phone which helps you take a break away from your digital world. This fork turns two Android experiments by [Special Projects](http://specialprojects.studio/), [Paper Phone](http://specialprojects.studio/project/paper-phone) and [Envelope](http://specialprojects.studio/project/envelope), into one plain HTML web app that runs in any browser, on a computer or a phone, with no install, account or API key.

![Paper Phone Image](190807PaperPhoneStills295-Edit.jpg)

## Use it

Open `index.html` in a browser, or publish the repository with GitHub Pages (Settings, Pages, deploy from the `master` branch, root folder) and visit the address GitHub gives you.

Choose what goes on the sheet, press **Print or save as PDF**, and print in landscape at 100% scale. Then fold three times; the app shows how.

## What it does

Everything the Android app printed:

* Contacts, calendar, tasks, a photo, a notes grid, weather, a paper app, a map with directions on the back, and cut marks for a contactless card.
* The same panel layout, typefaces and thirteen paper apps as the original.

New in the web edition:

* Works without Google sign-in. Type things in, or import contacts from a `.vcf` file and events from an `.ics` calendar export (daily, weekly, monthly and yearly repeats are understood; exceptions to a repeat are not).
* Print for any day, not only today.
* A fresh sudoku or maze every time you ask, and a page of your own text (a shopping list, a phrasebook, a poem).
* Typed text on the notes panel, above the dot grid.
* Weather for any town, in °C or °F, from [Open-Meteo](https://open-meteo.com/).
* Directions on foot, by bike or by car, drawn on an [OpenStreetMap](https://www.openstreetmap.org/copyright) map, using [Nominatim](https://nominatim.org/) for place search and the [FOSSGIS OSRM](https://routing.openstreetmap.de/) routing servers.
* A4 or US Letter paper.
* A backup file you can save and restore, and a live preview of the sheet as you edit.

## The phone envelope

Switch from **Folded booklet** to **Phone envelope** to print a paper sleeve for your phone, after the [Envelope](https://github.com/specialprojects-experiments/envelope) experiment. The original template only fitted the Google Pixel 3a; this one is drawn to measure.

* Sized for the Samsung Galaxy A08 by default (167.4 × 77.4 × 8 mm, 6.7 inch 20:9 screen), with a Pixel 3a preset and fields for any other phone.
* A keypad is printed on the front, over the screen. The back carries any two Paper Phone panels, such as your contacts and today's calendar.
* On the phone, open `call.html` and press Start. The keys glow through the paper, play dial tones, and the lower circle flashes the time digit by digit. The page shows how long you spent in the envelope today.
* `demo.html` lets you try it on a computer: a Galaxy A08 drawn to scale inside its envelope, with clickable keys that glow through the paper. No call is made.
* The printed keys and the glowing keys come from the same layout (`js/keypad.js`), measured as fractions of the screen, so they line up when the page is full screen. Where the screen starts below the top edge of the phone is an estimate for the A08; adjust "Screen starts" if the circles are off.

Limits of the web keypad: a web page cannot place a call itself, so the call key hands the number to the phone's own dialler, which then shows its own keypad; and it cannot answer incoming calls.

### The Android keypad app

`envelope-android/` is a small Android app (it also has the table tent mode) that removes those limits, in the way the original Envelope app did. Once you make it the phone app, calls are dialled, answered and ended on the envelope keypad and the system call screen never appears.

* Both things it needs (permission to call, and being the phone app) are asked for on its first screen, before the paper goes on.
* The key positions are the same fractions of the screen as `js/keypad.js`, so it matches the printed envelope on any phone.
* Tap the large circle to call or answer, hold it to clear the number or refuse a caller, tap it twice to hang up. During a call the digits are sent down the line.
* It stays usable over the lock screen, so the phone can stay locked, and dims the screen after 20 seconds without a tap to save battery.
* When you take the phone out, give calls back to your usual phone app (the first screen has a button for this).

Build it with `gradle assembleDebug` inside `envelope-android/` (Android SDK 35, Java 17 or newer). It needs Android 10 or later.

## The table tent

A third sheet, new to this fork, in the same spirit as the two experiments: a folded paper tent that covers everyone's phones for one meal.

* One sheet, four short cuts, six folds, no glue. The long sides carry a question for the table (facing one side) and a game that needs no screen (facing the other); a switch keeps both suitable for children.
* The last phone lies on top of the pile, screen up, and the tent rests on it. A code printed on the tent opens `tent.html` on that phone, which lights the printed circles through the paper: tap “who's next” and a light runs along the names and stops on one; a row of dots lights one every five minutes; and when a phone is picked up it chimes and the meal is over.
* The length of the meal is kept on the phone, and the next tent designed on that phone prints it.
* Important calls: the tent page asks everyone to switch on Do Not Disturb with starred contacts allowed, so those callers still ring. The Android app goes further on the top phone: you choose the callers who may ring, the tent's “call” circle pulses for them and a tap answers on the loudspeaker, and everyone else is silenced and counted.
* `tent.html?fast=1` runs the five-minute dots every three seconds, for trying it out.

## Privacy

What you type is stored only in your browser (local storage). Nothing is sent anywhere except the place names you look up for weather and directions, which go to the services listed above. An imported address book is read in the page and is not stored.

The map tiles and lookups come from free community services; they are meant for light personal use.

## Files

* `index.html`, `css/`, `js/` – the web app. `call.html` and `js/call.js` are the envelope keypad; `tent.html` and `js/tentpage.js` are the phone under the table tent; `js/tent.js` draws the tent. `js/vendor/qrcode.js` is Kazuhiko Arase's QR Code Generator (MIT). `js/sheet.js` draws the booklet as SVG, `js/envelope.js` draws the envelope, `js/keypad.js` holds the key layout both share, `js/tools.js` holds the puzzles, importers and lookups, `js/app.js` runs the page.
* `fonts/`, `paperapps/` – typefaces and paper app artwork from the original app.
* `envelope-android/` – the Android keypad app for the envelope.
* `android/` – the original Paper Phone Android source, unchanged.

## About the original

A lot of people feel that they spend too much time on their phones and struggle to find a balance with technology.

Paper Phone helps you have a little break away from your digital world by printing a personal booklet of the key information you’ll need that day. 

An app lets you choose what to include such as favourite contacts, maps and meetings and then prints them directly to a sheet of paper. 

Customisable “paper apps” like recipes, phrasebooks and notepads let you get things done or unwind in a more focussed way. 

We hope this little experiment can help you try a digital detox from technology and help you focus on the things that matter the most.

Paper Phone is an experimental open source Android app which is available to try right now. All of the code is available on Github for people to play with and hopefully adapt and evolve! 

Services:
* [OpenWeather](https://openweathermap.org/api)
* [Directions](https://developers.google.com/maps/documentation/directions/start)
* [Static Maps](https://developers.google.com/maps/documentation/maps-static/intro)
* [Places](https://developers.google.com/places/web-service/intro)
* [Tasks](https://developers.google.com/tasks/)

Android APIs:
* [PdfRenderer](https://developer.android.com/reference/android/graphics/pdf/PdfRenderer) - Rendering PDFs
* [ContentProvider](https://developer.android.com/guide/topics/providers/content-providers) - Read local contacts and calendar events
* [Android Printing Framework](https://developer.android.com/training/printing) - Printing

External libraries:
* [OkHttp](https://square.github.io/okhttp/)
* [Room](https://developer.android.com/topic/libraries/architecture/room)
* [Lottie](http://airbnb.io/lottie/)

[Try the app on the Google Play Store](https://play.google.com/store/apps/details?id=com.withgoogle.experiments.unplugged)

[Read more on Experiments with Google](https://experiments.withgoogle.com/paper-phone)

[Find out even more on our site](http://specialprojects.studio/project/paper-phone)
