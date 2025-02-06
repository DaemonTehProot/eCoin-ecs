export default 
`getAdminCreds: SELECT passwd FROM admin;;
getUserCredsByName: SELECT id, passwd FROM users WHERE name=?;;

getLogById: SELECT id, uId, desc, type, total, updated FROM logs WHERE id=?;;
getUserById: SELECT id, cId, tId, name, balance, earnings, updated FROM users WHERE id=?;;

getClassMulti: SELECT id, mp, name, updated FROM classes WHERE updated>?;;
getClassSingle: SELECT id, mp, name, updated FROM classes WHERE updated>? AND id=?;;

getUserMulti: SELECT id, cId, tId, balance, earnings, name, updated FROM users WHERE updated>?;;
getUserSingle: SELECT id, cId, tId, balance, earnings, name, updated FROM users WHERE updated>? AND id=?;;

getTeamMulti: SELECT id, cId, name, balance, updated FROM teams WHERE updated>? ORDER BY balance DESC;;
getTeamSingle: SELECT id, cId, name, balance, updated FROM teams WHERE updated>? AND cId=? ORDER BY balance DESC;;

getPriceMulti: SELECT id, cId, type, desc, cost, updated FROM prices WHERE updated>?;;
getPriceSingle: SELECT id, cId, type, desc, cost, updated FROM prices WHERE updated>? AND cId=?;;

getActiveBidsMulti: SELECT id, cId, amount, desc, notes, updated FROM activeBids WHERE updated>?;;
getActiveBidsSingle: SELECT id, cId, amount, desc, notes, updated FROM activeBids WHERE updated>? AND cId=?;;

getPlacedBidsMulti: SELECT id, cId, uId, bId, amount, updated FROM placedBids WHERE updated>?;;
getPlacedBidsSingle: SELECT id, cId, uId, bId, amount, updated FROM placedBids WHERE updated>? AND uId=?;;

getPurchasesMulti: SELECT id, cId, uId, desc, notes, quant, updated FROM purchases WHERE updated>?;;

getLogsMulti: SELECT uId, desc, type, notes, old, total, updated, date FROM logs WHERE updated>?;;
getLogsSingle: SELECT uId, desc, type, notes, old, total, updated, date FROM logs WHERE updated>? AND uId=?;;

getLeadWealthSingle: SELECT name, balance AS value FROM users WHERE cId=? ORDER BY balance DESC LIMIT 3;;
getLeadEarnedSingle: SELECT name, earnings AS value FROM users WHERE cId=? ORDER BY earnings DESC LIMIT 3;;

getBidById: SELECT cId, amount, desc, notes FROM activeBids WHERE id=?;;
getPriceById: SELECT cId, type, desc, (cost ->> (SELECT mp FROM classes WHERE id=cId)) AS cost FROM prices WHERE id=?;;

getPlacedByBidId: SELECT uId, amount FROM placedBids WHERE bId=?;;


addClass: INSERT INTO classes(mp, name, updated) VALUES(?,?,?);;
addUser: INSERT INTO users(cId, tId, name, passwd, updated) VALUES(?,?,?,?,?);;

addTeam: INSERT INTO teams(cId, name, balance, updated) VALUES(?,?,0,?);;
addPrice: INSERT INTO prices(cId, type, desc, cost, updated) VALUES(?,?,?,?,?);;

addLog: INSERT INTO logs(uId, desc, type, notes, old, total, updated) VALUES(?,?,?,?,?,?,?);;
addPurchase: INSERT INTO purchases(uId, cId, desc, notes, quant, updated) VALUES(?,?,?,?,?,?);;

addPlacedBid: INSERT INTO placedBids(uId, cId, bId, amount, updated) VALUES(?,?,?,?,?);;
addActiveBid: INSERT INTO activeBids(cId, amount, desc, notes, updated) VALUES(?,?,?,?,?);;


userTransact: UPDATE users SET balance=balance+?, updated=? WHERE id=?;;
adminTransact: UPDATE users SET balance=balance+?, earnings=earnings+?, updated=? WHERE id=?;;

teamTransact: UPDATE teams SET balance=balance+?, updated=? WHERE id=?;;

updateUserPass: UPDATE users SET passwd=? WHERE id=?;;
updateAdminPass: UPDATE admin SET passwd=?`