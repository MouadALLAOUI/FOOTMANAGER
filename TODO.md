# TODO

// all of this content is for simpleFrontend project. "frontend folder is the old version and not needed anymore"
s
## admin

- [ ] add remove and delete account (all roles)( avoid having too much in the db that may cause me problem).
- [ ] in analytic if today is selected it will show data depend on hours
- [ ] all setting page need to upgrade ui and ux (they are good but more things can still be added
- [ ] maintenence mode isn't working (i should be able to select the page i want to close for maintenence or whole app)
- [ ] user need to separate login data and info data (for example email a user can still change his email in info data but login with old email 'so changing email will not cause problem')
- [ ] for admin can generate a one time login (email + password) if user ask for them (account lost)
- [ ] lock activity (admin can lock other role activitée) in that state if they try update whatever in thier dashboard everything disable and request get blocked (still can see what already exist)
- [ ] admin can create another admin account (and define his authorities for example accepting signin request ...) this new account will be considered an subadmin account with same admin dashboard but actiond are hidden depend on what he is authorized to do
- [ ] player asking for teams build has no way to response

## terrain

- [ ] الإيرادات doesn't show charts
- [ ] analytics doesn't return any data 
```
exception
: 
"Error"
file
: 
"C:\\Users\\mouad\\Desktop\\FootMANAGER\\backend\\app\\Http\\Controllers\\Terrain\\TerrainOwnerController.php"
line
: 
749
message
: 
"Class \"App\\Http\\Controllers\\Terrain\\Cache\" not found"
```
- [ ] the city in terrain edit should be a select dropdown related to `cities` table in backend
- [ ] working time in edit terrain drawer should be in grid style not list 
- [ ] when i try to resize a drawer but dragging it work reversed when i drag left it resize the other way
- [ ] for closing a slot it can be done from the calendar by clicking on a empty slot '/closures' page is hard to use it make it easier for user to use (simple ux and ui give only open time when selecting a date to select from when to close

## manager

### overview

- [ ] new match drawer time input and date use the default inputs should use timepicker component
- [ ] changing player number return an error "The name field is required."
- [ ] quick terrain reservation time should show only open to use times

### analytics

- [ ] ```

exception
: 
"Symfony\\Component\\HttpKernel\\Exception\\NotFoundHttpException"
file
: 
"C:\\Users\\mouad\\Desktop\\FootMANAGER\\backend\\vendor\\laravel\\framework\\src\\Illuminate\\Routing\\AbstractRouteCollection.php"
line
: 
44
message
: 
"The route api/v1/team/statistics could not be found."
```

### matches

- [ ] found a match that says finished but no score shows (it should show the set score)
- [ ] new match modal time input and date use the default inputs should use timepicker component
- [ ] time picker show behind the modal (also its better to show the empty slots as a select dropdown (create a new component TimesSelect that show empty slot depend on time and terrain can be used for other thing than the terrains later on)
- [ ] drawer should be 60% of page width

### players

- [ ] add a way to define plan and issential player and change and more of team control
- [ ] can add player with account to be permantly in the team and they will get notification depend on manager action (eg : you're position has been changed from attack to middle)
- [ ] the manager can set how will player play depend on terrain for example 5v5 (select player and give them position) 7v7 (choose another way to place players) ... 
- [ ] choosing the capting and free kick and other roles

### bookings

- [ ] past reservation shouldn't showbut if reservation type is abonement it will select the next incoming avaible time.
- 

## player

- [ ] clicking on a booking allow him to see manager profile and what is the empty position (manager should define what position he's looking for)
- [ ] 

## committee

- [ ] خطوات الإعداد show only steps but no text in them
- [ ] for free team add a btn to be able to add bulk free team in one go
- [ ] match result and event can be set only after they begin 'for example can't give a result to a match happening tomorrow'
- [ ] event should be progressive for example adding an event at 35' min then next setting another event at 15' min should not be allowed
- [ ] as i see in event it only accept one team event and goals the other team event show but with no effect on the match for example (team 1 vs team 2 // team 1 score a goal score change to 1-0 but if i add an event that say team 2 scored a goal i still get 1-0 for team 1 and 0 for team two with an error msg saying "النتيجة لا تتطابق مع أحداث المباراة المسجلة"
- [ ] even round one all match are done i still get أكمل جميع مباريات الجولة السابقة لفتح هذا الدور  
- [ ] partner modal doesn't close after i save a new one same for sponsor
- [ ] in content order input has no meaning or need 
- [ ] Publish date should be now() by default
- [ ] news in tournoment landing thosen't show at all

## general

- [ ] blocked or removed manager or teams should have a badge of blocked for all roles
- [ ] clicking a profile photo allow you to see the whole pic
- [ ] why did committee reseave a notification of a player wanting to create a team (where only admin can approve it)

## landing page

- [ ] /privacy page and /terms TOC scroll on the content and that made it impossible to read the content
- [ ] some of the landing page need margin bottom  to have a small space between them and the footer

## for deploy production

- [ ] update the backend composer.json to have all needed package and plugin
```
npm install cached
0ms
npm warn config production Use `--omit=dev` instead.

npm prune --omit=dev --ignore-scripts cached
0ms

copy /app/node_modules cached
0ms

copy composer.lock, artisan
1s

composer install --optimize-autoloader --no-scripts --no-interaction
2s
Composer plugins have been disabled for safety in this non-interactive session.
Set COMPOSER_ALLOW_SUPERUSER=1 if you want to allow plugins to run as root/super user.
Do not run Composer as root/super user! See https://getcomposer.org/root for details
Installing dependencies from lock file (including require-dev)
Verifying lock file contents can be installed on current platform.
Your lock file does not contain a compatible set of packages. Please run composer update.

  Problem 1
    - mpdf/mpdf is locked to version v8.3.1 and an update of this package was not requested.
    - mpdf/mpdf v8.3.1 requires ext-gd * -> it is missing from your system. Install or enable PHP's gd extension.
To enable extensions, verify that they are enabled in your .ini files:
    - /usr/local/etc/php/conf.d/docker-php-ext-opcache.ini
    - /usr/local/etc/php/conf.d/docker-php-ext-pdo_mysql.ini
    - /usr/local/etc/php/conf.d/docker-php-ext-sodium.ini
    - /usr/local/etc/php/conf.d/php.ini
You can also run `php --ini` in a terminal to see which files are used by PHP in CLI mode.
Alternatively, you can run Composer with `--ignore-platform-req=ext-gd` to temporarily ignore these required extensions.
Build Failed: build daemon returned an error < failed to solve: process "composer install --optimize-autoloader --no-scripts --no-interaction" did not complete successfully: exit code: 2 >
```
- [ ] vercel.json file for simpleFrontend project

## for the far future

- [ ] add a page for team formation (tchkila) "drag and drop player profile to where they would play the ui may look like in fifa or like in pes"

