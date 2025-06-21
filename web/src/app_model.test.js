import { getSpiesFromFaction } from './app_model';


test('extracts spies correctly', () => {
    const input = {
      "status": true,
      "message": "Spy data found.",
      "faction": {
        "ID": 99999,
        "name": "Anonymous Syndicate",
        "members": {
          "1000001": {
            "name": "User_Alpha",
            "level": 100,
            "days_in_faction": 238,
            "last_action": {
              "status": "Offline",
              "timestamp": 1750231312,
              "relative": "17 hours ago"
            },
            "status": {
              "description": "Okay",
              "details": "",
              "state": "Okay",
              "color": "green",
              "until": 0
            },
            "position": "Operative",
            "id": 1000001,
            "spy": {
              "strength": 201000000,
              "defense": 199000000,
              "speed": 205000000,
              "dexterity": 240000000,
              "total": 845000000,
              "timestamp": 1750214654
            }
          },
          "1000002": {
            "name": "User_Beta",
            "level": 84,
            "days_in_faction": 113,
            "last_action": {
              "status": "Online",
              "timestamp": 1750294319,
              "relative": "0 minutes ago"
            },
            "status": {
              "description": "Okay",
              "details": "",
              "state": "Okay",
              "color": "green",
              "until": 0
            },
            "position": "Specialist",
            "id": 1000002,
            "spy": {
              "strength": 101000000,
              "defense": 220000000,
              "speed": 210000000,
              "dexterity": 90000000,
              "total": 621000000,
              "timestamp": 1750216696
            }
          },
          "1000003": {
            "name": "User_Charlie",
            "level": 24,
            "days_in_faction": 86,
            "last_action": {
              "status": "Offline",
              "timestamp": 1750292955,
              "relative": "23 minutes ago"
            },
            "status": {
              "description": "Okay",
              "details": "",
              "state": "Okay",
              "color": "green",
              "until": 0
            },
            "position": "Scout",
            "id": 1000003,
            "spy": {
              "strength": 15000,
              "defense": 5000,
              "speed": 30000,
              "dexterity": 12000,
              "total": 62000,
              "timestamp": 1750231942
            }
          },
          "1000004": {
            "name": "User_Delta",
            "level": 13,
            "days_in_faction": 27,
            "last_action": {
              "status": "Offline",
              "timestamp": 1750286656,
              "relative": "2 hours ago"
            },
            "status": {
              "description": "Okay",
              "details": "",
              "state": "Okay",
              "color": "green",
              "until": 0
            },
            "position": "Initiate",
            "id": 1000004,
            "spy": {
              "strength": 2000,
              "defense": 800,
              "speed": 3500,
              "dexterity": 1700,
              "total": 8000,
              "timestamp": 1750233235
            }
          }
        }
      }
    };

    const result = getSpiesFromFaction(input.faction);

    expect(result).toEqual([
        {
            name: 'User_Alpha',
            level: '100',
            speed: '205,000,000',
            strength: '201,000,000',
            defense: '199,000,000',
            dexterity: '240,000,000'
        },
        {
            name: 'User_Beta',
            level: '84',
            speed: '210,000,000',
            strength: '101,000,000',
            defense: '220,000,000',
            dexterity: '90,000,000'
        },
        {
            name: 'User_Charlie',
            level: '24',
            speed: '30,000',
            strength: '15,000',
            defense: '5,000',
            dexterity: '12,000'
        },
        {
            name: 'User_Delta',
            level: '13',
            speed: '3,500',
            strength: '2,000',
            defense: '800',
            dexterity: '1,700'
        }
    ]);

});
