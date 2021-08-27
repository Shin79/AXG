// Import d'Express, body-parser, pg et dotenv dans le code
var express = require('express');
var bodyParser = require('body-parser');
var pg = require('pg');
pg.defaults.ssl = true;
const dotenv = require('dotenv');
dotenv.config();
// Création du serveur Express
var app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const uri = "postgres://gwbgsvnchhmloy:5fe63c0466c47df31d971056a3b30a240afb1c7812becfc919cbca208c4c6ef3@ec2-52-214-178-113.eu-west-1.compute.amazonaws.com:5432/d3bp6gumtmf0bi"
// On assigne la variable 'port'
app.set('port', process.env.PORT || 3000);

app.use(express.static('public'));
app.use(bodyParser.json());
console.log("Database_URL",process.env.DATABASE_URL);

// On définit la route pour l'authentification
app.post('/contact/authent', function(req, res) {
    // On se connecte
	pg.connect(process.env.DATABASE_URL || uri, async function (err, conn, done) {
		// Vérification des problèmes de connexion
		if (err) console.log(err);
		console.log('req.body : ' + JSON.stringify(req.body));
		console.log('req.body.user:-' + req.body.user + '-');
		console.log('req.body.pwd:-' + req.body.pwd + '-');
        // On fait la requête 
		conn.query(
			'SELECT Id, FirstName, LastName, Email, Phone, SfId, Unique_Id_Email__c FROM salesforce.Contact WHERE LOWER(Email) = LOWER($1) AND MobileAppPwd__c = ($2)',
            // On supprime les espaces
			[req.body.user.trim(), req.body.pwd.trim()],
			function(err, result) {
				done();
				if (err != null || result.rowCount == 0) {
					// échec de l'authentication 
					if (result.rowCount == 0) {
						res.status(403).json({error: 'User/Password not found'});
					} else {
						res.status(400).json({error: err.message});
					}
				}
				else {
					// Succès de l'authentication 
					res.json(result);
				}
			}
		);
	});
});

// On définit la route pour la mise à jour des contacts
app.post('/update', function(req, res) {
    pg.connect(process.env.DATABASE_URL || uri, function (err, conn, done) {
        
        // Vérification des problèmes de connexion
        if (err) console.log(err);
        // On met à jour les valeurs des entrées souhaitées
        conn.query(
            'UPDATE salesforce.Contact SET Phone = $1, MobilePhone = $1 WHERE LOWER(FirstName) = LOWER($2) AND LOWER(LastName) = LOWER($3) AND LOWER(Email) = LOWER($4)',
            [req.body.phone.trim(), req.body.firstName.trim(), req.body.lastName.trim(), req.body.email.trim()],
            function(err, result) {
                // S'il n'y a pas de correspondance, on crée le contact
                if (err != null || result.rowCount == 0) {
                  conn.query('INSERT INTO salesforce.Contact (Phone, MobilePhone, FirstName, LastName, Email) VALUES ($1, $2, $3, $4, $5)',
                  [req.body.phone.trim(), req.body.phone.trim(), req.body.firstName.trim(), req.body.lastName.trim(), req.body.email.trim()],
                  function(err, result) {
                    done();
                    if (err) {
                        res.status(400).json({error: err.message});
                    }
                    else {
                        // this will still cause jquery to display 'Record updated!'
                        // eventhough it was inserted
                        res.json(result);
                    }
                  });
                }
                else {
                    done();
                    res.json(result);
                }
            }
        );
    });
});

// On définit la route pour récupérer les contrats
app.get('/getContracts', function(req, res) {
    pg.connect(process.env.DATABASE_URL, function (err, conn, done) {
        // Vérification des problèmes de connexion
        if (err) {
            console.log(err);
            return;
        }
        // On requête les contrats contenant des produits
        conn.query('SELECT Name, Product__c FROM salesforce.Contract WHERE Product__c IS NOT NULL',
        function(err, result) {
            console.log(result)
            if (err) {
                // Si Bad Request -> on met fin au processus de réponse
                res.status(400).json({error: err.message});
                return res.end();
            }
            else {
                res.json(result);
                return res.end();
            }
        });
        
    });
});

// On définit la route pour récupérer les produits
app.get('/getProducts', function(req, res) {
        pg.connect(process.env.DATABASE_URL, function (err, conn, done) {

        // Vérification des problèmes de connexion
        if (err) {
            console.log(err);
            return;
        }
        // On  requête les produits contenant le terme 'Assurance'
        conn.query('SELECT Name,Family FROM salesforce.Product2 WHERE Name LIKE \'%Assurance%\' ',
        function(err, result) {
            console.log(result)
            if (err) {
                res.status(400).json({error: err.message});
            }
            else {

                res.json(result);
            }
        });
        
    });
});
// On spécifie un port ppour que le serveur soit à l'écoute
const server = app.listen(process.env.PORT || 3000, () => {
    const port = server.address().port;
    console.log(`Express server listening on port ${port}` );
});