import Database from '@ioc:Adonis/Lucid/Database'
import { UserFactory } from 'Database/factories'
import { test } from '@japa/runner'
import Hash from '@ioc:Adonis/Core/Hash'

test.group('User', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })

  test('it should create an user', async ({ client, assert }) => {
    const userPayload = {
      email: 'test@test.com',
      username: 'test',
      password: '12345678',
    }

    const response = await client.post('/users').json(userPayload)

    const { password, ...expected } = userPayload

    console.log(expected)

    response.assertStatus(201)
    response.assertBodyContains({ user: expected })
    assert.notExists(response.body().user.password, 'Password defined')
  })

  test('it should return 409 when email is already in use', async ({ client, assert }) => {
    const { email } = await UserFactory.create()

    const response = await client.post('/users').json({
      email,
      username: 'test',
      password: '12345678',
    })

    response.assertStatus(409)
    assert.exists(response.body().message)
    assert.exists(response.body().code)
    assert.exists(response.body().status)
    assert.include(response.body().message, 'email')
    assert.equal(response.body().code, 'BAD_REQUEST')
  })

  test('it should return 409 when username is already in use', async ({ client, assert }) => {
    const { username } = await UserFactory.create()

    const response = await client.post('/users').json({
      username,
      email: 'teste@test.com',
      password: '12345678',
    })

    response.assertStatus(409)
    assert.exists(response.body().message)
    assert.exists(response.body().code)
    assert.exists(response.body().status)
    assert.include(response.body().message, 'username')
    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 409)
  })

  test('it shoud return 422 when required data is not provided', async ({ client, assert }) => {
    const response = await client.post('/users').json({})

    response.assertStatus(422)
    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 422)
  })

  test('it should return 422 when providing an invalid email', async ({ client, assert }) => {
    const response = await client.post('/users').json({
      email: 'test@',
      username: 'test',
      password: '12345678',
    })

    response.assertStatus(422)
    assert.equal(response.body().code, 'BAD_REQUEST')
  })

  test('it should return 422 when providing an invalid password', async ({ client, assert }) => {
    const response = await client.post('/users').json({
      email: 'test@test.com',
      username: 'test',
      password: '1234',
    })

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 422)
  })

  test('it should update an user', async ({ client }) => {
    const user = await UserFactory.create()
    const email = 'test@test.com'
    const avatar = 'https://github.com/eloilsondosanjos.png'

    const response = await client
      .put(`/users/${user.id}`)
      .json({
        email,
        avatar,
        password: user.password,
      })
      .loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      user: {
        id: user.id,
        email,
        avatar,
      },
    })
  })

  test('it should update the password of the user', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const password = '12348765'

    const response = await client
      .put(`/users/${user.id}`)
      .json({
        email: user.email,
        avatar: user.avatar,
        password,
      })
      .loginAs(user)

    const { ...expected } = response.body()

    response.assertStatus(200)
    response.assertBodyContains(expected)
    assert.exists(response.body().user, 'User undefined')

    await user.refresh()
    const checkPassword = await Hash.verify(user.password, password)
    assert.isTrue(checkPassword)
  })

  test('it should return 422 when required data is not provided', async ({ client }) => {
    const user = await UserFactory.create()

    const response = await client.put(`/users/${user.id}`).json({}).loginAs(user)

    response.assertStatus(422)
  })

  test('it should return 422 when providing an invalid email', async ({ client }) => {
    const user = await UserFactory.create()

    const response = await client
      .put(`/users/${user.id}`)
      .json({
        email: 'test@',
        password: user.email,
        avatar: user.avatar,
      })
      .loginAs(user)

    response.assertStatus(422)
  })

  test('it should return 422 when providing an invalid password', async ({ client }) => {
    const user = await UserFactory.create()

    const response = await client
      .put(`/users/${user.id}`)
      .json({
        email: user.email,
        password: 12345,
        avatar: user.avatar,
      })
      .loginAs(user)

    response.assertStatus(422)
  })

  test('it should return 422 when providing an invalid avatar', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const response = await client
      .put(`/users/${user.id}`)
      .json({
        email: user.email,
        password: user.password,
        avatar: 'test',
      })
      .loginAs(user)

    response.assertStatus(422)
    assert.equal(response.body().code, 'BAD_REQUEST')
  })
})
