import { UserFactory } from 'Database/factories'
import Database from '@ioc:Adonis/Lucid/Database'
import test from 'japa'
import supertest from 'supertest'

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`

test.group('Session', (group) => {
  test('it should authentcate an user', async (assert) => {
    const unencryptedPassword = '12345678'

    const { id, email } = await UserFactory.merge({ password: unencryptedPassword }).create()

    const { body } = await supertest(BASE_URL)
      .post('/sessions')
      .send({
        email,
        password: unencryptedPassword,
      })
      .expect(201)

    assert.isDefined(body.user, 'User undefined')
    assert.equal(body.user.id, id)
  })

  test('it should return an api token when session is created', async (assert) => {
    const unencryptedPassword = '12345678'

    const { id, email } = await UserFactory.merge({ password: unencryptedPassword }).create()

    const { body } = await supertest(BASE_URL)
      .post('/sessions')
      .send({
        email,
        password: unencryptedPassword,
      })
      .expect(201)

    assert.isDefined(body.token, 'Token undefined')
    assert.equal(body.user.id, id)
  })

  test('it should return 400 when credentials are not provided', async (assert) => {
    const { body } = await supertest(BASE_URL).post('/sessions').send({}).expect(400)

    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 400)
  })

  test('it should return 400 when credentials are invalid', async (assert) => {
    const { email } = await UserFactory.create()

    const { body } = await supertest(BASE_URL)
      .post('/sessions')
      .send({
        email,
        password: 'test',
      })
      .expect(400)

    assert.equal(body.code, 'BAD_REQUEST')
    assert.equal(body.status, 400)
    assert.equal(body.message, 'invalid credentials')
  })

  test('it should return 200 when user signs out', async () => {
    const unencryptedPassword = '12345678'

    const { email } = await UserFactory.merge({ password: unencryptedPassword }).create()

    const { body } = await supertest(BASE_URL)
      .post('/sessions')
      .send({
        email,
        password: unencryptedPassword,
      })
      .expect(201)

    const apiToken = body.token

    await supertest(BASE_URL)
      .delete('/sessions')
      .set('Authorization', `Bearer ${apiToken.token}`)
      .expect(200)
  })

  test('it should revoke token when user signs out', async (assert) => {
    const unencryptedPassword = '12345678'

    const { email } = await UserFactory.merge({ password: unencryptedPassword }).create()

    const { body } = await supertest(BASE_URL)
      .post('/sessions')
      .send({
        email,
        password: unencryptedPassword,
      })
      .expect(201)

    const apiToken = body.token

    await supertest(BASE_URL)
      .delete('/sessions')
      .set('Authorization', `Bearer ${apiToken.token}`)
      .expect(200)

    const existsToken = await Database.query().select('*').from('api_tokens')

    assert.isEmpty(existsToken)
  })

  group.beforeEach(async () => {
    await Database.beginGlobalTransaction()
  })

  group.afterEach(async () => {
    await Database.rollbackGlobalTransaction()
  })
})
