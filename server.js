var express = require('express');
var bodyParser = require('body-parser');
var pg = require('pg');

var app = express();

app.set('port', process.env.PORT || 5000);

app.use(express.static('public'));
app.use(bodyParser.json());

app.post('/contact/authent', function(req, res) {
	pg.connect(process.env.DATABASE_URL, function (err, conn, done) {
		// watch for any connect issues
		if (err) console.log(err);
		console.log('req.body : ' + JSON.stringify(req.body));
		console.log('req.body.user:-' + req.body.user + '-');
		console.log('req.body.pwd:-' + req.body.pwd + '-');
		conn.query(
			'SELECT Id, FirstName, LastName, Email, Phone, SfId FROM salesforce.Contact WHERE LOWER(Email) = LOWER($1) AND MobileAppPwd__c = ($2)',
			[req.body.user.trim(), req.body.pwd.trim()],
			function(err, result) {
				done();
				if (err != null || result.rowCount == 0) {
					// authentication failed
					if (result.rowCount == 0) {
						res.status(403).json({error: 'User/Password not found'});
					} else {
						res.status(400).json({error: err.message});
					}
				}
				else {
					// authentication success
					res.json(result);
				}
			}
		);
	});
});

app.post('/contracts', function(req, res) {
	pg.connect(process.env.DATABASE_URL, function (err, conn, done) {
		// watch for any connect issues
		if (err) console.log(err);
		console.log('req.body : ' + JSON.stringify(req.body));
		conn.query(
			'SELECT Id, Name, Product_Assu__c FROM salesforce.Contract_Assu__c WHERE LOWER(Contact__c) = LOWER($1)',
			[req.body.contactId.trim()],
			function(err, result) {
				done();
				if (err != null || result.rowCount == 0) {
					if (result.rowCount == 0) {
						res.status(204).json({error: 'No results found'});
					} else {
						res.status(400).json({error: err.message});
					}
				}
				else {
					// Results found => sub query to retrieve product of eachr row with the SfId
					result.rows.forEach(function(item, index) {
						console.log('CLE : row ' + index + ', item ' + JSON.stringify(item));
						console.log('CLE : item.product_assu__c to modify : -' + item.product_assu__c + '-');
						conn.query(
							'SELECT Name FROM salesforce.Product_Assu__c WHERE SfId = $1',
							[item.product_assu__c],
							function(err2, result2) {
								done();
								console.log('CLE result2:'+JSON.stringify(result2));
								console.log('CLE err2:'+JSON.stringify(err2));
								if (err2 == null && result2.rowCount != 0) {
									// Result found in Produc_Assu__c => replace product Id by product name in result
									item.product_assu__c = result2.rows[0].name;
									console.log('CLE - Update name new : ' + result2.rows[0].name);
								}
								console.log('CLE --------------- length ' + result.rows.length);
								console.log('CLE --------------- index + 1 ' + (index + 1));
								if (result.rows.length == index + 1) {
									callbackContracts(res, result);
								}
							}
						);
					/*}).then(function() {
						console.log('CLE : RESULT =' +JSON.stringify(result));
						res.json(result);*/
					});
					//console.log('CLE : RESULT =' +JSON.stringify(result));
					//res.json(result);
				}
			}
		);
	});
});

function callbackContracts(res, result) {
	console.log('CLE : RESULT =' +JSON.stringify(result));
	res.json(result);
}

app.post('/products', function(req, res) {
	pg.connect(process.env.DATABASE_URL, function (err, conn, done) {
		// watch for any connect issues
		if (err) console.log(err);
		conn.query(
			'SELECT Name FROM salesforce.Product_Assu__c',
			function(err, result) {
				done();
				if (err != null || result.rowCount == 0) {
					if (result.rowCount == 0) {
						res.status(403).json({error: 'No product found'});
					} else {
						res.status(400).json({error: err.message});
					}
				}
				else {
					res.json(result);
				}
			}
		);
	});
});

app.post('/update', function(req, res) {
	pg.connect(process.env.DATABASE_URL, function (err, conn, done) {
		// watch for any connect issues
		if (err) console.log(err);
		conn.query(
			'UPDATE salesforce.Contact SET Phone = $1, MobilePhone = $1 WHERE LOWER(FirstName) = LOWER($2) AND LOWER(LastName) = LOWER($3) AND LOWER(Email) = LOWER($4)',
			[req.body.phone.trim(), req.body.firstName.trim(), req.body.lastName.trim(), req.body.email.trim()],
			function(err, result) {
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

app.listen(app.get('port'), function () {
	console.log('Express server listening on port ' + app.get('port'));
});