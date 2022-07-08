import { DateTime, Duration } from 'luxon'
import Hash from '@ioc:Adonis/Core/Hash'
import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import Mail from '@ioc:Adonis/Addons/Mail'
import { UserFactory } from 'Database/factories'

test.group('Password', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })

  test('it should send and email with forgot password instructions', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const mailer = Mail.fake()

    await client.post('/forgot-password').json({
      email: user.email,
      resetPasswordUrl: 'url',
    })

    assert.isTrue(mailer.exists({ to: [{ address: user.email }] }))
    assert.isTrue(mailer.exists({ from: { address: 'no-reply@roleplay.com' } }))
    assert.isTrue(mailer.exists({ subject: 'Roleplay: Recuperação de senha' }))
    assert.isTrue(mailer.exists((mail) => mail.html!.includes(user.username)))

    Mail.restore()
  }).timeout(0)

  test('it should create a reset password token', async ({ client, assert }) => {
    const user = await UserFactory.create()

    await client.post('/forgot-password').json({
      email: user.email,
      resetPasswordUrl: 'url',
    })

    const tokens = await user.related('tokens').query()

    assert.isNotEmpty(tokens)
  }).timeout(0)

  test('it should return 422 when required data is not provided or data is invalid', async ({
    client,
    assert,
  }) => {
    const response = await client.post('/forgot-password').json({})

    response.assertStatus(422)
    assert.equal(response.body().code, 'BAD_REQUEST')
  })

  // test('it should be able to reset password', async ({ client, assert }) => {
  //   const user = await UserFactory.create()
  //   const { token } = await user.related('tokens').create({ token: 'token' })

  //   await client.post('/reset-password').json({
  //     token,
  //     password: '12345678',
  //   })

  //   await user.refresh()
  //   const checkPassword = await Hash.verify(user.password, '12345678')
  //   assert.isTrue(checkPassword)
  // })

  // test('it should return 422 when required data is not provided or data is invalid', async ({
  //   client,
  //   assert,
  // }) => {
  //   const response = await client.post('/reset-password').json({})

  //   response.assertStatus(422)
  //   assert.equal(response.body().code, 'BAD_REQUEST')
  // })

  test('it should return 404 when using the token twice', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const { token } = await user.related('tokens').create({ token: 'token' })

    await client.post('/reset-password').json({ token, password: '12345678' })

    const response = await client.post('/reset-password').json({ token, password: '12345678' })

    response.assertStatus(404)
    assert.equal(response.body().code, 'BAD_REQUEST')
  })

  // test('it cannot reset password when token is expired after 2 hours', async (assert) => {
  //   const user = await UserFactory.create()

  //   const date = DateTime.now().minus(Duration.fromISOTime('02:01'))

  //   const { token } = await user.related('tokens').create({ token: 'token', createdAt: date })

  //   const { body } = await supertest(BASE_URL)
  //     .post('/reset-password')
  //     .send({ token, password: '12345678' })
  //     .expect(410)

  //   assert.equal(body.code, 'TOKEN_EXPIRED')
  //   assert.equal(body.status, 410)
  //   assert.equal(body.message, 'token has expired')
  // })
})
