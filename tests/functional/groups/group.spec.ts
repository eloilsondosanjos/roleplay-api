import Database from '@ioc:Adonis/Lucid/Database'
import { test } from '@japa/runner'
import Group from 'App/Models/Group'
import { GroupFactory, UserFactory } from 'Database/factories'

test.group('Group', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })

  test('it should create a group', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }

    const response = await client.post('/groups').json(groupPayload).loginAs(user)

    assert.exists(response.body().group, 'Group undefined')
    assert.equal(response.body().group.name, groupPayload.name)
    assert.equal(response.body().group.description, groupPayload.description)
    assert.equal(response.body().group.schedule, groupPayload.schedule)
    assert.equal(response.body().group.location, groupPayload.location)
    assert.equal(response.body().group.chronic, groupPayload.chronic)
    assert.equal(response.body().group.master, groupPayload.master)
    assert.exists(response.body().group.players, 'Players undefined')
    assert.equal(response.body().group.players.length, 1)
    assert.equal(response.body().group.players[0].id, groupPayload.master)
  })

  test('it should return 422 when required data is not provided', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const response = await client.post('/groups').json({}).loginAs(user)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 422)
  })

  test('it should update a group', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const group = await GroupFactory.merge({ master: user.id }).create()
    const payload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
    }

    const response = await client.patch(`/groups/${group.id}`).json(payload).loginAs(user)

    assert.exists(response.body().group, 'Group undefined')
    assert.equal(response.body().group.name, payload.name)
    assert.equal(response.body().group.description, payload.description)
    assert.equal(response.body().group.schedule, payload.schedule)
    assert.equal(response.body().group.location, payload.location)
    assert.equal(response.body().group.chronic, payload.chronic)
  })

  test('it should return 404 when providing an unexisting group for update', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()

    const response = await client.patch(`/groups/1`).json({}).loginAs(user)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 404)
  })

  test('it should remove user from group', async ({ client, assert }) => {
    const userMaster = await UserFactory.create()

    const group = await GroupFactory.merge({ master: userMaster.id }).create()
    const unencryptedPassword = '12345678'
    const userPlay = await UserFactory.merge({ password: unencryptedPassword }).create()
    await client.post('/sessions').json({
      email: userPlay.email,
      password: unencryptedPassword,
    })

    const response = await client.post(`/groups/${group.id}/requests`).json({}).loginAs(userPlay)

    await client
      .post(`/groups/${group.id}/requests/${response.body().groupRequest.id}/accept`)
      .loginAs(userMaster)

    await client.delete(`/groups/${group.id}/players/${userPlay.id}`).loginAs(userMaster)

    await group.load('players')
    assert.isEmpty(group.players)
  })

  test('it should not remove the master of the group', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }

    const response = await client.post('/groups').json(groupPayload).loginAs(user)

    const group = response.body().group

    await client.delete(`/groups/${group.id}/players/${user.id}`).loginAs(user)

    const groupModel = await Group.findOrFail(group.id)

    await groupModel.load('players')
    assert.isNotEmpty(groupModel.players)
  })

  test('it should remove the group', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }

    const response = await client.post('/groups').json(groupPayload).loginAs(user)

    const group = response.body().group

    await client.delete(`/groups/${group.id}`).json({}).loginAs(user)

    const emptyGroup = await Database.query().from('groups').where('id', group.id)
    assert.isEmpty(emptyGroup)

    const players = await Database.query().from('groups_users')
    assert.isEmpty(players)
  })

  test('it should return 404 when providing an unexisting group for deletion', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()

    const response = await client.delete(`/groups/1`).json({}).loginAs(user)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 404)
  })

  test('it should return all groups when no query is provided to list groups', async ({
    client,
    assert,
  }) => {
    const user = await UserFactory.create()

    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }

    const responseCreateGroup = await client.post('/groups').json(groupPayload).loginAs(user)

    const group = responseCreateGroup.body().group

    const response = await client.get('/groups').loginAs(user)

    assert.exists(response.body().groups, 'Groups undefined')
    assert.equal(response.body().groups.data.length, 1)
    assert.equal(response.body().groups.data[0].id, group.id)
    assert.equal(response.body().groups.data[0].name, group.name)
    assert.equal(response.body().groups.data[0].description, group.description)
    assert.equal(response.body().groups.data[0].location, group.location)
    assert.equal(response.body().groups.data[0].schedule, group.schedule)
    assert.exists(response.body().groups.data[0].masterUser, 'Master undefined')
    assert.equal(response.body().groups.data[0].masterUser.id, user.id)
    assert.equal(response.body().groups.data[0].masterUser.username, user.username)
    assert.equal(response.body().groups.data[0].masterUser.id, user.id)
    assert.isNotEmpty(response.body().groups.data[0].players, 'Empty players')
    assert.equal(response.body().groups.data[0].players[0].id, user.id)
    assert.equal(response.body().groups.data[0].players[0].email, user.email)
    assert.equal(response.body().groups.data[0].players[0].username, user.username)
  })

  test('it should return no groups by user id', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }

    await client.post('/groups').json(groupPayload).loginAs(user)

    const response = await client.get('/groups?user=123').loginAs(user)

    assert.exists(response.body().groups, 'Groups undefined')
    assert.equal(response.body().groups.data.length, 0)
  })

  test('it should return all groups by user id', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }

    const responseCreateGroup = await client.post('/groups').json(groupPayload).loginAs(user)

    const group = responseCreateGroup.body().group

    const response = await client.get(`/groups?user=${user.id}`).loginAs(user)

    assert.exists(response.body().groups, 'Groups undefined')
    assert.equal(response.body().groups.data.length, 1)
    assert.equal(response.body().groups.data[0].id, group.id)
    assert.equal(response.body().groups.data[0].name, group.name)
    assert.equal(response.body().groups.data[0].description, group.description)
    assert.equal(response.body().groups.data[0].location, group.location)
    assert.equal(response.body().groups.data[0].schedule, group.schedule)
    assert.exists(response.body().groups.data[0].masterUser, 'Master undefined')
    assert.equal(response.body().groups.data[0].masterUser.id, user.id)
    assert.equal(response.body().groups.data[0].masterUser.username, user.username)
    assert.equal(response.body().groups.data[0].masterUser.id, user.id)
    assert.isNotEmpty(response.body().groups.data[0].players, 'Empty players')
    assert.equal(response.body().groups.data[0].players[0].id, user.id)
    assert.equal(response.body().groups.data[0].players[0].email, user.email)
    assert.equal(response.body().groups.data[0].players[0].username, user.username)
  })

  test('it should return all groups by user id and name', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }

    const responseCreateGroup = await client.post('/groups').json(groupPayload).loginAs(user)

    await client
      .post('/groups')
      .json({ ...groupPayload, name: 'dois', description: '123' })
      .loginAs(user)

    const group = responseCreateGroup.body().group

    const response = await client.get(`/groups?user=${user.id}&term=es`).loginAs(user)

    assert.exists(response.body().groups, 'Groups undefined')
    assert.equal(response.body().groups.data.length, 1)
    assert.equal(response.body().groups.data[0].id, group.id)
    assert.equal(response.body().groups.data[0].name, group.name)
    assert.equal(response.body().groups.data[0].description, group.description)
    assert.equal(response.body().groups.data[0].location, group.location)
    assert.equal(response.body().groups.data[0].schedule, group.schedule)
    assert.exists(response.body().groups.data[0].masterUser, 'Master undefined')
    assert.equal(response.body().groups.data[0].masterUser.id, user.id)
    assert.equal(response.body().groups.data[0].masterUser.username, user.username)
    assert.equal(response.body().groups.data[0].masterUser.id, user.id)
    assert.isNotEmpty(response.body().groups.data[0].players, 'Empty players')
    assert.equal(response.body().groups.data[0].players[0].id, user.id)
    assert.equal(response.body().groups.data[0].players[0].email, user.email)
    assert.equal(response.body().groups.data[0].players[0].username, user.username)
  })

  test('it should return all groups by user id and description', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const groupPayload = {
      name: '123',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }

    const responseCreateGroup = await client.post('/groups').json(groupPayload).loginAs(user)

    await client
      .post('/groups')
      .json({ ...groupPayload, name: 'dois', description: '123' })
      .loginAs(user)

    const group = responseCreateGroup.body().group

    const response = await client.get(`/groups?user=${user.id}&term=es`).loginAs(user)

    assert.exists(response.body().groups, 'Groups undefined')
    assert.equal(response.body().groups.data.length, 1)
    assert.equal(response.body().groups.data[0].id, group.id)
    assert.equal(response.body().groups.data[0].name, group.name)
    assert.equal(response.body().groups.data[0].description, group.description)
    assert.equal(response.body().groups.data[0].location, group.location)
    assert.equal(response.body().groups.data[0].schedule, group.schedule)
    assert.exists(response.body().groups.data[0].masterUser, 'Master undefined')
    assert.equal(response.body().groups.data[0].masterUser.id, user.id)
    assert.equal(response.body().groups.data[0].masterUser.username, user.username)
    assert.equal(response.body().groups.data[0].masterUser.id, user.id)
    assert.isNotEmpty(response.body().groups.data[0].players, 'Empty players')
    assert.equal(response.body().groups.data[0].players[0].id, user.id)
    assert.equal(response.body().groups.data[0].players[0].email, user.email)
    assert.equal(response.body().groups.data[0].players[0].username, user.username)
  })

  test('it should return all groups by name', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const groupPayload = {
      name: 'test',
      description: '123',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }

    const responseCreateGroup = await client.post('/groups').json(groupPayload).loginAs(user)

    await client
      .post('/groups')
      .json({ ...groupPayload, name: 'dois', description: '123' })
      .loginAs(user)

    const group = responseCreateGroup.body().group

    const response = await client.get(`/groups?term=es`).loginAs(user)

    assert.exists(response.body().groups, 'Groups undefined')
    assert.equal(response.body().groups.data.length, 1)
    assert.equal(response.body().groups.data[0].id, group.id)
    assert.equal(response.body().groups.data[0].name, group.name)
    assert.equal(response.body().groups.data[0].description, group.description)
    assert.equal(response.body().groups.data[0].location, group.location)
    assert.equal(response.body().groups.data[0].schedule, group.schedule)
    assert.exists(response.body().groups.data[0].masterUser, 'Master undefined')
    assert.equal(response.body().groups.data[0].masterUser.id, user.id)
    assert.equal(response.body().groups.data[0].masterUser.username, user.username)
    assert.equal(response.body().groups.data[0].masterUser.id, user.id)
    assert.isNotEmpty(response.body().groups.data[0].players, 'Empty players')
    assert.equal(response.body().groups.data[0].players[0].id, user.id)
    assert.equal(response.body().groups.data[0].players[0].email, user.email)
    assert.equal(response.body().groups.data[0].players[0].username, user.username)
  })

  test('it should return all groups by description', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const groupPayload = {
      name: '123',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }

    const responseCreateGroup = await client.post('/groups').json(groupPayload).loginAs(user)

    await client
      .post('/groups')
      .json({ ...groupPayload, name: 'dois', description: '123' })
      .loginAs(user)

    const group = responseCreateGroup.body().group

    const response = await client.get(`/groups?term=es`).loginAs(user)

    assert.exists(response.body().groups, 'Groups undefined')
    assert.equal(response.body().groups.data.length, 1)
    assert.equal(response.body().groups.data[0].id, group.id)
    assert.equal(response.body().groups.data[0].name, group.name)
    assert.equal(response.body().groups.data[0].description, group.description)
    assert.equal(response.body().groups.data[0].location, group.location)
    assert.equal(response.body().groups.data[0].schedule, group.schedule)
    assert.exists(response.body().groups.data[0].masterUser, 'Master undefined')
    assert.equal(response.body().groups.data[0].masterUser.id, user.id)
    assert.equal(response.body().groups.data[0].masterUser.username, user.username)
    assert.equal(response.body().groups.data[0].masterUser.id, user.id)
    assert.isNotEmpty(response.body().groups.data[0].players, 'Empty players')
    assert.equal(response.body().groups.data[0].players[0].id, user.id)
    assert.equal(response.body().groups.data[0].players[0].email, user.email)
    assert.equal(response.body().groups.data[0].players[0].username, user.username)
  })
})
