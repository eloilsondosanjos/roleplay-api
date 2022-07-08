import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import GroupRequest from 'App/Models/GroupRequest'
import { GroupFactory, UserFactory } from 'Database/factories'

test.group('Group Request', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })

  test('it should create a group request', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const masterId = await UserFactory.create()

    const group = await GroupFactory.merge({ master: masterId.id }).create()

    const response = await client.post(`/groups/${group.id}/requests`).json({}).loginAs(user)

    assert.exists(response.body().groupRequest, 'GroupRequest undefined')
    assert.equal(response.body().groupRequest.userId, user.id)
    assert.equal(response.body().groupRequest.groupId, group.id)
    assert.equal(response.body().groupRequest.status, 'PENDING')
  })

  test('it should return 409 when group request already exists', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const masterId = await UserFactory.create()

    const group = await GroupFactory.merge({ master: masterId.id }).create()

    await client.post(`/groups/${group.id}/requests`).json({}).loginAs(user)

    const response = await client.post(`/groups/${group.id}/requests`).json({}).loginAs(user)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 409)
  })

  test('it should return 422 when user is already in the group', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }

    const responseCreateGoup = await client.post('/groups').json(groupPayload).loginAs(user)

    const response = await client
      .post(`/groups/${responseCreateGoup.body().group.id}/requests`)
      .json({})
      .loginAs(user)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 422)
  })

  test('it should list group request by master', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const responseCreateGoup = await client
      .post(`/groups/${group.id}/requests`)
      .json({})
      .loginAs(user)

    const groupRequest = responseCreateGoup.body().groupRequest

    const response = await client
      .get(`/groups/${group.id}/requests?master=${master.id}`)
      .loginAs(user)

    assert.exists(response.body().groupRequests, 'GroupRequests undefined')
    assert.equal(response.body().groupRequests.length, 1)
    assert.equal(response.body().groupRequests[0].id, groupRequest.id)
    assert.equal(response.body().groupRequests[0].userId, groupRequest.userId)
    assert.equal(response.body().groupRequests[0].groupId, groupRequest.groupId)
    assert.equal(response.body().groupRequests[0].status, groupRequest.status)
    assert.equal(response.body().groupRequests[0].group.name, group.name)
    assert.equal(response.body().groupRequests[0].user.username, user.username)
    assert.equal(response.body().groupRequests[0].group.master, master.id)
  })

  test('it should return an empty list when master has no group requests', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    await client.post(`/groups/${group.id}/requests`).json({}).loginAs(user)

    const response = await client
      .get(`/groups/${group.id}/requests?master=${user.id}`)
      .loginAs(user)

    assert.exists(response.body().groupRequests, 'GroupRequests undefined')
    assert.equal(response.body().groupRequests.length, 0)
  })

  test('it should return 422 when master is not provided', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const response = await client.get(`/groups/${group.id}/requests`).loginAs(user)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 422)
  })

  test('it should accept a group request', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const group = await GroupFactory.merge({ master: user.id }).create()

    const responseCreateGoup = await client
      .post(`/groups/${group.id}/requests`)
      .loginAs(user)
      .json({})

    const response = await client
      .post(`/groups/${group.id}/requests/${responseCreateGoup.body().groupRequest.id}/accept`)
      .loginAs(user)

    assert.exists(response.body().groupRequest, 'GroupRequest undefined')
    assert.equal(response.body().groupRequest.userId, user.id)
    assert.equal(response.body().groupRequest.groupId, group.id)
    assert.equal(response.body().groupRequest.status, 'ACCEPTED')

    await group.load('players')
    assert.isNotEmpty(group.players)
    assert.equal(group.players.length, 1)
    assert.equal(group.players[0].id, user.id)
  })

  test('it should return 404 when providing an unexisting group', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const responseCreateGoup = await client
      .post(`/groups/${group.id}/requests`)
      .json({})
      .loginAs(user)

    const response = await client
      .post(`/groups/9999/requests/${responseCreateGoup.body().groupRequest.id}/accept`)
      .loginAs(user)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 404)
  })

  test('it should return 404 when providing an unexisting group request', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    await client.post(`/groups/${group.id}/requests`).loginAs(user).json({})

    const response = await client.post(`/groups/${group.id}/requests/9999/accept`).loginAs(user)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 404)
  })

  test('it should reject a group request', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const group = await GroupFactory.merge({ master: user.id }).create()

    const response = await client.post(`/groups/${group.id}/requests`).loginAs(user).json({})

    await client
      .delete(`/groups/${group.id}/requests/${response.body().groupRequest.id}`)
      .loginAs(user)

    const groupRequest = await GroupRequest.find(response.body().groupRequest.id)

    assert.isNull(groupRequest)
  })

  test('it should return 404 when providing an unexisting group for rejection', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const responseCreateGoup = await client
      .post(`/groups/${group.id}/requests`)
      .loginAs(user)
      .json({})

    const response = await client
      .delete(`/groups/9999/requests/${responseCreateGoup.body().groupRequest.id}`)
      .loginAs(user)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 404)
  })

  test('it should return 404 when providing an unexisting group request for rejection', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    await client.post(`/groups/${group.id}/requests`).loginAs(user).json({})

    const response = await client.delete(`/groups/${group.id}/requests/9999`).loginAs(user)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 404)
  })
})
