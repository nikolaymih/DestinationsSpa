const user = firebase.auth()
const db = firebase.firestore();

const app = Sammy('#container', function () {

    this.use("Handlebars", 'hbs')

    // get

    this.get('/home', function (context) {
        db.collection('destinations')
            .get()
            .then((response) => {
                context.destinations = response.docs.map((destination) => { return { id: destination.id, ...destination.data() } });
                console.log(context);
                loadPartial(context)
                    .then(function () {
                        this.partial('./templates/home.hbs');
                    })
            })
            .catch(errorHandler)
    })

    this.get('/login', function (context) {
        loadPartial(context)
            .then(function () {
                this.partial('./templates/login.hbs')
            })
        // .catch(errorHandler)
    });

    this.get('/register', function (context) {

        loadPartial(context)
            .then(function () {
                this.partial('./templates/register.hbs')
            })
    })

    this.get('/add-destination', function (context) {
        loadPartial(context)
            .then(function () {
                this.partial('./templates/add-destination.hbs')
            })
    })

    this.get('/own-destination', function (context) {
        const ownedDes = []
        currentUser = getUserStorage().uid
       

        db.collection('destinations')
            .get()
            .then((response) => {
                
                context.destinations = response.docs.map((destination) => { return { id: destination.id, ...destination.data() } });
                console.log(context);
                context.destinations.map((destination) => {
                    if(destination.creatorId === currentUser) {
                        ownedDes.push(destination)
                    }
                })
                context.ownDes = ownedDes;

                loadPartial(context)
                    .then(function () {
                        this.partial('./templates/own-destination.hbs')
                    })
            })
    })

    this.get('/logout', function (context) {
        user.signOut()
            .then((response) => {
                clearLocalStorage()
                this.redirect('#/login')
            })
        // .catch(errorHandler)
    })

    this.get('/details/:id', function (context) {
        const { id } = context.params

        db.collection('destinations')
            .doc(id)
            .get()
            .then((response) => {
                // Logic for is owner or not
                const currentUser = getUserStorage().uid;
                const actualOwner = response.data().creatorId;
                const isOwner = actualOwner === currentUser;

                context.destination = { ...response.data(), isOwner }

                loadPartial(context)
                    .then(function () {
                        this.partial('./templates/details.hbs')
                    })
            })
    })

    this.get('/edit-destination/:id', function (context) {
        const { id } = context.params

        db.collection('destinations')
            .doc(id)
            .get()
            .then((response) => {
                context.destination = { id: id, ...response.data() }
                console.log(context);
                loadPartial(context)
                    .then(function () {
                        this.partial('./templates/edit-destination.hbs')
                    })
            })
    })

    this.get('/delete/:id', function (context) {
        const { id } = context.params;

        db.collection("destinations")
            .doc(id)
            .delete()
            .then(() => {
                this.redirect('#/own-destination')
            })
    })

    // post

    this.post('/register', function (context) {
        const { email, password, repeatPassword } = context.params

        if (password != repeatPassword) {
            context.error = true;
            loadError(context, 'register')
            return
        }

        user.createUserWithEmailAndPassword(email, password)
            .then((response) => {
                setUserStorage(response)
                this.redirect('#/home');
            })
            .catch((response) => {
                context.error = true;
                loadError(context, 'register')
            })
    })

    this.post('/login', function (context) {
        const { email, password } = context.params

        user.signInWithEmailAndPassword(email, password)
            .then((response) => {
                setUserStorage(response)
                this.redirect('#/home');
            })
            .catch((response) => {
                context.error = true;
                loadError(context, 'login')
            })
    })

    this.post('/add-destination', function (context) {
        const { destination, city, duration, departureDate, imgUrl } = context.params;
        const creatorId = getUserStorage().uid;

        db.collection('destinations').add({
            destination,
            city,
            duration,
            departureDate,
            imgUrl,
            creatorId
        })
            .then((createdProduct) => {
                this.redirect('#/home')
            })
    })

    this.post('/edited-destination/:id', function (context) {
        const { id, destination, city, duration, departureDate, imgUrl } = context.params
        const creatorId = getUserStorage().uid
        console.log(creatorId);

        db.collection('destinations')
            .doc(id)
            .set({
                creatorId,
                destination,
                city,
                duration,
                departureDate,
                imgUrl
            })
            .then(() => {
                this.redirect(`#/details/${id}`)
            })
        //.catch(errorHandler)
    })

});

function loadPartial(context) {

    const user = getUserStorage()
    context.isLoggedIn = user ? true : false;
    context.userEmail = user ? user.email : '';

    return context.loadPartials({
        'header': './partials/header.hbs',
        'footer': './partials/footer.hbs',
        'successBox': './partials/successMessage.hbs',
        'errorBox': './partials/errorMessage.hbs'
    })
}

function errorHandler() {
    console.log('Something wrong happened');
}

function loadError(context, navigation) {
    loadPartial(context)
        .then(function () {
            this.partial(`./templates/${navigation}.hbs`)
        })
}

function setUserStorage(response) {
    const { user: { email, uid } } = response;
    localStorage.setItem('user', JSON.stringify({ email, uid }))
}

function getUserStorage() {
    const user = localStorage.getItem('user');

    return user ? JSON.parse(user) : ''
}

function clearLocalStorage() {
    localStorage.clear();
}

(() => {
    app.run('#/home')
})();