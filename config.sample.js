/**
 * sample config file
 * write your own custom db wrapper or extensions
 * use cp config.sample.js config.js to create one
 *
 * db implementation is picked by env DB_TYPE, default 'sqlite'
 * to use your own db, write a Db class (or db config) below
 * and set DB_TYPE=custom, or just provide the Db class here
 */

/**
 * custom db configuration
 * optional, conf is forwarded to the Db constructor
 * module can point to a db implementation file instead of the Db class
 */

/*
export const db = {
  // tells the db loader to use the custom db below
  type: 'custom',
  // path to a db module exporting dbAction, optional
  // module: './my-db.js',
  // any extra conf for your db implementation
  conf: {
    // host: 'localhost',
    // port: 3306
  }
}
*/

/**
 * db class
 * similar to mongodb
 * either implement dbAction(dbName, op, ...args) directly,
 * or the mongo-like collection api below (one instance per table)
 */

/*
export class Db {
  constructor (conf) {
    console.log(conf.tableName)
  }
  async findOne () {}
  async insert () {}
  async update () {}
  async remove () {}
  async find () {}
}
*/

/**
 * extensions
 */

/*
export const extensions = [
  {
    appExtend: (app, jwtMiddleWare, jwtErrorHandler) => {
      app.get('/hello', (req, res) => {
        res.send('hello world')
      })
      app.get('/api/api-need-login', jwtMiddleWare, jwtErrorHandle, (req, res) => {
        res.send('hello api')
      })
    }
  }
]
*/
