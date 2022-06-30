import test from 'japa'

test.group('Exemple', () => {
  test('assert sum', (assert) => {
    assert.equal(2 + 2, 4)
  })
})
