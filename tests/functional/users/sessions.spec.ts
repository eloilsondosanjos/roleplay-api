import { UserFactory } from 'Database/factories'
import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'

test.group('Session', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })

  test('it should authentcate an user', async ({ client }) => {
    const unencryptedPassword = '12345678'

    const user = await UserFactory.merge({ password: unencryptedPassword }).create()

    const response = await client.post('/sessions').json({
      email: user.email,
      password: unencryptedPassword,
    })

    const { ...expected } = response.body()

    response.assertStatus(201)
    response.assertBodyContains(expected)
  })

  test('it should return an api token when session is created', async ({ client, assert }) => {
    const unencryptedPassword = '12345678'

    const { id, email } = await UserFactory.merge({ password: unencryptedPassword }).create()

    const response = await client.post('/sessions').json({
      email,
      password: unencryptedPassword,
    })

    assert.isDefined(response.body().token, 'Token undefined')
    assert.equal(response.body().user.id, id)
  })

  test('it should return 400 when credentials are not provided', async ({ client, assert }) => {
    const response = await client.post('/sessions').json({})

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 400)
  })

  test('it should return 400 when credentials are invalid', async ({ client, assert }) => {
    const { email } = await UserFactory.create()

    const response = await client.post('/sessions').json({
      email,
      password: 'test',
    })

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 400)
    assert.equal(response.body().message, 'invalid credentials')
  })

  test('it should return 200 when user signs out', async ({ client }) => {
    const unencryptedPassword = '12345678'

    const user = await UserFactory.merge({ password: unencryptedPassword }).create()

    await client
      .post('/sessions')
      .json({
        email: user.email,
        password: unencryptedPassword,
      })
      .loginAs(user)

    const response = await client.delete('/sessions').loginAs(user)

    response.assertStatus(200)
  })

  // test('it should revoke token when user signs out', async ({ client, assert }) => {
  //   const unencryptedPassword = '12345678'

  //   const user = await UserFactory.merge({ password: unencryptedPassword }).create()

  //   await client
  //     .post('/sessions')
  //     .json({
  //       email: user.email,
  //       password: unencryptedPassword,
  //     })
  //     .loginAs(user)

  //   await client.delete('/sessions').loginAs(user)

  //   const existsToken = await Database.query().select('*').from('api_tokens')

  //   //response.assertStatus(200)
  //   assert.isEmpty(existsToken)
  // })
})
