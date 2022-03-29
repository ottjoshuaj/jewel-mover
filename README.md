# Jewel-Mover

## Project Summary

This project has TWO modes. The first mode offers up a console based application that allows you to manage multiple wallets all mining that allows the movement of jewel after each hero starts mining and then
comes back and cancels the quest as needed and starts the flow all over again

The other mode offers the API Service to the WinForms app that handles the flow a lot better then the node edition does.  While the node console app works,  the WinForm app more efficient at the process along
with real time stats, management and so much more!

## Setup

1. Clone the repo
2. From folder run:  npm install
3. To run the "console" version type:   npm run local
4. To run the "api" for the winform app type:  npm run localserver


## How to use the app:

When running in the console mode you are presented with a simple menu.  Choose the option for the action you want to perform.

Quite simple,  you first need to import your main "sourcing" wallet.  Once imported you can then generate (x) amount of wallets.
Then you can send heroes from your main "source" wallet to these new wallets.   Make sure your jewel+locked jewel (you have to have both and always leave some normal jewel at all times).
You then need to use the menu to send ONE to each wallet and onboard each wallet to DFK.

Once all the prep is done you can run the auto-bot option.

The console will constantly output activity.

#Note:

The Wallet data file is stored in /datafiles  This way if you ever need to manually see who has the jewel, hero assignments etc you can do it from there.
You can also quit the app, edit the file and restart the app accordingly.

#Software License - Agreement

If you have access to this source code you have agreed to the NDA and Non-Compete.  This is NOT open source!
Providing access to this app without due permission from the author is against and fully punishable by the law.

