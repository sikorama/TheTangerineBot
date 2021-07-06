/**
 * Gestion des utilisateurs, coté serveur
 */

import { Meteor } from 'meteor/meteor';
import { BotChannels } from '../imports/api/collections';

//Renvoie vrai si l'utilisateur a un role donné
//Par défaut les superadmins on tous les roles
// roles: tableau ou string (séparé par des espaces)
export function hasRole(userId, roles, nobypass) {
    if (userId === undefined) return false;
    if (roles === undefined) return false;

    if (nobypass != true)
        if (Roles.userIsInRole(userId, 'superadmin')) return true;
    let r;
    if (typeof roles === 'string')
        r = roles.split(' ');
    else
        r = roles;

    for (let i = 0; i < r.length; i++) {
        if (Roles.userIsInRole(userId, r[i])) return true;
    }
    return false;
}

// Raccourci pour tester si on est admin
export function isAdmin(userId) {
    return (Roles.userIsInRole(userId, 'admin'));
    //    return hasRole(userId, ['admin']);
}

// Recuper les groupes associés a un userId
export function getUserGroups(userId) {
    let user = Meteor.users.findOne(userId);
    //    console.info('get User Group', user);
    if (user === undefined) return [];
    let userg = user.profile.groups;
    // Si pas de groupe => pas de resulat? ou 'default' ?
    if (userg === undefined) return [];
    return userg;
}

export function setUserGroups(userid, groups) {
    console.warn('Set User Group', userid, groups);
    // Ajouter groups ici?
    if (groups != undefined)
        Meteor.users.update(userid, {
            $set: {
                'groups': groups
            }
        });
};

export function setUserRoles(userid, roles) {
    console.warn("set User Roles", userid, roles)
    if (roles != undefined)
        Roles.setUserRoles(userid, roles);
};

//doc: username, mail, password, roles, groups
export function addUser(doc) {
    // TODO: filtrer les role, groupes, etc.. pour que ce soit légal
    let u = Meteor.users.findOne({
        'username': doc.username
    });

    console.error(u, doc);
    if (u === undefined) {
        let id = Accounts.createUser({
            'username': doc.username,
            'email': doc.email,
            'password': doc.password,
            profile: {
                //                map_icon_std: "/tang1.png",
                //                map_icon_name: "/tang3.png",
                //                map_icon_msg: "/favicon-32.png",
                'groups': doc.groups // Rustine temporaire
            },
            //            'groups': doc.groups
        });

        if (Meteor.roleAssignment.find({ 'user._id': id }).count() === 0) {
            doc.roles.forEach(function (role) {
                Roles.createRole(role, { unlessExists: true });
            });
            // Need _id of existing user record so this call must come after `Accounts.createUser`.
            Roles.addUsersToRoles(id, doc.roles);
        }
        return id;
    }
    return null;
}

function qaddUser(name, pw, roles, groups) {
    return addUser({
        username: name,
        email: name + "@sikorama.fr",
        password: pw,
        roles: roles,
        groups: groups,
    });
}

function createSuperAdmin(uname, pw) {
    let allchans = BotChannels.find({ enabled: true }).fetch().map((item) => item.channel);
    qaddUser(uname, pw, ['admin', 'superadmin'], allchans);
}

// chan is an array
function createStreamerAccount(uname, chan, pw, pwguest) {
    if (chan && !Array.isArray(chan))
        chan = [chan];

    qaddUser(uname, pw, ['streamer'], chan);
    // update botchannel collection?
}

// Add defalt user accounts
function createDefaultAccounts() {
    createSuperAdmin('admin', 'admin');
    createStreamerAccount('myname', 'mychannel', 'mypass');
};

export function init_users() {
    // Create default account if none exists
    if (Meteor.users.find().count() === 0) {
        createDefaultAccounts();
    }

    Meteor.methods({
        insertUser: function (doc) {
            console.info('insert user', doc, this.userId, isAdmin(this.userId));
            if (isAdmin(this.userId)) {
                // Sanitize?
                // Check channels,pw...
                if (!doc.name || !doc.pw) {
                    console.error('name or pw missing');
                    return;
                }
                if (!doc.chan) {
                    console.error('no channel defined');
                }
                createStreamerAccount(doc.name, doc.chan, doc.pw);
            }
            else {
                console.error('Insert User: not allowed!')
            }
        },
        removeUser: function (uid) {
            if (isAdmin(this.userId) && (uid != undefined)) {
                Meteor.users.remove(uid);
            }
        },
        updateUser: function (doc) {
            if (isAdmin(this.userId)) {
                const user = Meteor.users.findOne(doc._id);
                if (user != undefined) {
                    //console.error('modifier', doc.modifier);
                    Meteor.users.update(doc._id, doc.modifier);
                }
            }
        },
        forcePassword: function (doc) {
            if (isAdmin(this.userId)) {
                try {
                    const newPassword = doc.modifier['$set'].password;
                    Accounts.setPassword(doc._id, newPassword);
                }
                catch (e) {
                    console.error(e);
                }
            }
        },
        setUserRoles: function (name, roles) {
            if (isAdmin(this.userId)) {
                const user = Meteor.users.findOne({
                    'username': name
                });
                console.warn("SetUserRoles", name, roles)
                if (user != undefined)
                    setUserRoles(user._id, roles);
            }
        },
        setUserRole: function (uid, role, state) {
            if (isAdmin(this.userId)) {
                if (role==='superadmin')
                    return;

                let r = Meteor.roleAssignment.find({ 'user._id': uid }).fetch();
                let exists = r.indexOf(role) >= 0;
                if (!exists && (state === true)) {
                    r.push(role);
                    setUserRoles(uid, r);
                }
                if (exists && (state === false)) {
                    // Remove Role
                    r.splice(r.indexOf(role), 1);
                    setUserRoles(uid, r);
                }
            }

        },
        toggleUserRole: function (uid, role) {
            if (isAdmin(this.userId)) {
                if (role==='superadmin')
                    return;                    
                let r = Meteor.roleAssignment.find({ 'user._id': uid }).fetch().map((rr)=>rr.role._id);
                let i = r.indexOf(role); 
                if (i < 0) {
                    r.push(role);
                }
                else {
                    r.splice(i, 1);
                }
                setUserRoles(uid, r);
            }
        },
        setUserGroups: function (name, groups) {
            if (isAdmin(this.userId)) {
                const user = Meteor.users.findOne({
                    'username': name
                });
                if (user != undefined)
                    setUserGroups(user._id, groups);
            }
        }
    });


    // publication des Roles
    Meteor.publish(null, function () {
        if (this.userId) {
            return Meteor.roleAssignment.find({ 'user._id': this.userId });
        } else {
            this.ready()
        }
    });

    // Publication des users pour l'admin
    Meteor.publish('allUsers', function () {
        if (isAdmin(this.userId)) {
            // Ne retourne que les champs nécessaires
            const options = {
                fields: {
                    username: 1,
                    profile: 1,
                    groups: 1
                }
            };
            return Meteor.users.find({}, options);
        }
        this.ready();
    });


    Meteor.users.allow({
        update(userid, doc) {
            if (hasRole(userid, 'admin')) return true;
        }
    });


    // Publication universelle des groupes et données de profil de l'utilisateur
    Meteor.publish(null, function () {
        if (this.userId) {
            return Meteor.users.find({
                _id: this.userId
            }, {
                fields: {
                    groups: 1
                }
            });
        } else {
            this.ready();
        }
    });

}
