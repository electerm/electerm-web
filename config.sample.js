/**
 * sample config file
 * write your own custom db wrapper or extensions
 * use cp config.sample.js config.js to create one
 */

/**
 * db class
 * similar to mongodb
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
