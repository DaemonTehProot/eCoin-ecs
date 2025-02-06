export default `
CREATE TABLE admin(passwd text NOT null);;

CREATE TABLE classes(
    id integer NOT null PRIMARY KEY,

    mp number NOT null,
    name text NOT null,

    updated integer NOT null
);;

CREATE TABLE teams(
    id integer NOT null PRIMARY KEY,
    cId integer NOT null REFERENCES classes(id) ON DELETE CASCADE,

    name text NOT null,
    balance number NOT null,

    updated integer NOT null
);;

CREATE TABLE prices(
    id integer NOT null PRIMARY KEY,
    cId integer NOT null REFERENCES classes(id) ON DELETE CASCADE,

    type text NOT null,
    desc text NOT null,

    cost text NOT null,

    updated integer NOT null
);;


CREATE TABLE users(
    id integer NOT null PRIMARY KEY,

    tId integer REFERENCES teams(id) ON DELETE SET null, 
    cId integer NOT null REFERENCES classes(id) ON DELETE CASCADE,

    balance number NOT null DEFAULT 0,
    earnings number NOT null DEFAULT 0,

    name text NOT null UNIQUE,
    passwd text NOT null UNIQUE,

    updated integer NOT null
);;

CREATE TABLE logs(
    uId integer NOT null REFERENCES users(id) ON DELETE CASCADE,

    desc text NOT null,
    type text NOT null,
    notes text NOT null,

    old integer NOT null,
    total integer NOT null,
 
    updated integer NOT null,
    date text NOT null DEFAULT (datetime('now', 'localtime'))
);;


CREATE TABLE purchases(
    id integer NOT null PRIMARY KEY,

    cId integer NOT null REFERENCES classes(id) ON DELETE CASCADE,
    uId integer NOT null REFERENCES users(id) ON DELETE CASCADE,

    desc text NOT null,
    notes text NOT null,

    quant number NOT null,
    updated integer NOT null
);;


CREATE TABLE activeBids(
    id integer NOT null PRIMARY KEY,
    cId integer NOT null REFERENCES classes(id) ON DELETE CASCADE,

    desc text NOT null,
    notes text NOT null, -- This is not needed anymore but keep for compat

    amount number NOT null,
    
    updated integer NOT null
);;

CREATE TABLE placedBids(
    id integer NOT null PRIMARY KEY,

    uId integer NOT null REFERENCES users(id) ON DELETE CASCADE,
    cId integer NOT null REFERENCES classes(id) ON DELETE CASCADE,
    bId integer NOT null REFERENCES activeBids(id) ON DELETE CASCADE,

    amount number NOT null,
    updated integer NOT null
)`;